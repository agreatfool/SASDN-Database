import {
  BaseEntity as OrmLibBaseEntity,
  Connection as OrmLibConnection,
  createConnections as OrmLibCreateConnections,
  getConnectionManager as OrmLibGetConnectionManager,
  ObjectType as OrmLibObjectType,
} from 'typeorm';
import { DatabaseOptions } from './interface/DatabaseOptions';
import { EntityStorage } from './EntityStorage';
import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import { ToolUtils } from '../utils/ToolUtils';
import { glob } from 'glob';
const HashRing = require('hashring');

export class DatabaseFactory {

  private static _instance: DatabaseFactory;

  // Find connection by Entity's class name. Map<className, connectionName>
  private readonly _entityToConnection: { [key: string]: string } = {};

  private readonly _shardHashMap: { [key: string]: any } = {};

  static get instance(): DatabaseFactory {
    if (this._instance === undefined) {
      this._instance = new DatabaseFactory();
    }
    return this._instance;
  }

  get shardHashMap(): { [key: string]: any } {
    return this._shardHashMap;
  }

  get entityToConnection(): { [key: string]: string } {
    return this._entityToConnection;
  }

  /**
   * Read given path to find ShardTable then copy & rewrite shardTableEntity
   * @param {string | Function} entityPath 
   * @param {Set<string>} classSet 
   */
  private async _checkShardTable(entityPath: string | Function,
    classSet: Set<string>): Promise<any> {
    if (typeof (entityPath) === 'function') {
      return;
    }

    const filePaths: string[] = glob.sync(entityPath);
    for (const filePath of filePaths) {
      if (await ToolUtils.isCopyFile(filePath)) {
        continue;
      }

      // find fileName
      const pathParse = LibPath.parse(filePath);
      const fileName = pathParse.name;

      // find rootPath to copy sharding table file
      const rootPath = pathParse.dir;
      const content = await LibFs.readFile(filePath, 'utf-8');

      // find className
      const className = await ToolUtils.getClassName(content);
      classSet.add(className);
      EntityStorage.instance.shardTableFileStorage[className] = filePath;

      let shardCount = 0;
      try {
        // find sharding count
        shardCount = await ToolUtils.getShardCount(content);
      } catch (error) {
        //console.log('caught finding table error = ', error);
        continue;
      }

      classSet.delete(className);
      const classHash = new HashRing();
      for (let i = 0; i < shardCount; i++) {
        try {
          // copy file
          const { newFileName, newFilePath } = await ToolUtils.copyNewFile(
            fileName, filePath, rootPath, i);
          // rewrite file
          const newClassName = await ToolUtils.rewriteFile(className, content, newFilePath, i);
          classSet.add(newClassName);
          classHash.add(newClassName);
          EntityStorage.instance.shardTableFileStorage[newClassName] = newFilePath;
        } catch (error) {
          //console.log('caught sharding table error = ', error);
          continue;
        }
      }
      this.shardHashMap[className] = classHash;
    }
    return;
  }

  /**
   * Create Database by option
   * @param {DatabaseOptions} option DatabaseOptions
   * @param {string} outputPath which path to create ConnectionMap.json
   */
  async initialize(option: DatabaseOptions, outputPath?: string): Promise<any> {
    const entitySet: Set<string> = new Set();
    for (const opts of option.optionList) {
      for (const entity of opts.entities) {
        await this._checkShardTable(entity, entitySet);
      }
    }
    const connections = await OrmLibCreateConnections(option.optionList);
    const connMap: any = {};
    if (option.shardingStrategies) {
      for (const strategy of option.shardingStrategies) {
        if (!OrmLibGetConnectionManager().has(strategy.connctionName)) {
          throw new Error('There is no such ConnectionName in ShardingStrategy');
        }
        for (const etyname of strategy.entities) {
          if (!entitySet.has(etyname)) {
            throw new Error('There is no such EntityName in ShardingStrategy');
          }
          this.entityToConnection[etyname] = strategy.connctionName;
        }
        connMap[strategy.connctionName] = strategy.entities;
      }
    } else {
      const entitiesClass = [...entitySet];
      for (let i = 0; i < entitiesClass.length; i++) {
        const index = (i + connections.length) % connections.length;
        const connName = connections[index].name;
        const className = entitiesClass[i];
        this.entityToConnection[className] = connName;
        if (connMap[connName] === undefined) {
          connMap[connName] = [];
        }
        (connMap[connName] as string[]).push(className);
      }
    }
    // if given outputPath then will write ConnectionMap to show [ connection => Entity ]
    if (outputPath && LibFs.statSync(outputPath).isDirectory()) {
      LibFs.writeFileSync(LibPath.join(outputPath, 'ConnectionMap.json')
        , JSON.stringify(connMap));
    }
  }

  /**
   * Return Connection by Entity
   * @param {BaseOrmEntity} entity
   */
  getConnection<T extends OrmLibBaseEntity>(entity: OrmLibObjectType<T>): OrmLibConnection {
    const connectionName = this.entityToConnection[(entity as any).name];
    return OrmLibGetConnectionManager().get(connectionName);
  }

  /**
   * Get Entity by given className & shardKey
   * @param {string | Function} entity
   * @param {string | number} shardKey
   */
  getEntity(entity: string | Function, shardKey?: string | number): any {
    let className = typeof (entity) === 'function' ? entity.constructor.name : entity;
    const args = EntityStorage.instance.shardTableMetadataStorage[className];
    if (args) {
      shardKey = shardKey === undefined ? '' : shardKey;
      className = this.shardHashMap[className].get(shardKey);
    }
    const filePath = EntityStorage.instance.shardTableFileStorage[className];
    if (filePath === undefined) {
      throw new Error(`Can not found a Entity with name: ${className}`);
    }
    return require(filePath)[className];
  }
}
