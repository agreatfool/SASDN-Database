import {
  BaseEntity as LibOrmBaseEntity,
  Connection as LibOrmConnection,
  createConnections as LibOrmCreateConnections,
  getConnectionManager as LibOrmGetConnectionManager,
  ObjectType as LibOrmObjectType,
} from 'typeorm';
import { DatabaseOptions } from './interface/DatabaseOptions';
import { EntityStorage } from './EntityStorage';
import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import { ToolUtils } from '../utils/ToolUtils';
import { glob } from 'glob';
import { ZipkinBase } from 'sasdn-zipkin';

const HashRing = require('hashring');
const debug = require('debug')('SASDN:Database');

export class DatabaseFactory {

  private static _instance: DatabaseFactory;

  // Find connection by Entity's class name. Map<className, connectionName>
  private readonly _entityToConnection: { [key: string]: string } = {};

  private readonly _shardHashMap: { [key: string]: any } = {};

  private readonly _classMap: { [key: string]: any } = {};

  private _zipkin: ZipkinBase;

  private _context: object;

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

  updateZipkin(zipkin:ZipkinBase, ctx: object) {
    this._zipkin = zipkin;
    this._context = ctx;
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

      let className;
      try {
        // find className
        className = await ToolUtils.getClassName(content);
      } catch (error) {
        debug(`caught finding className error = ${error}`);
        continue;
      }
      classSet.add(className);
      EntityStorage.instance.shardTableFileStorage[className] = filePath;

      let shardCount = 0;
      try {
        // find sharding count
        shardCount = await ToolUtils.getShardCount(content);
      } catch (error) {
        debug(`caught finding table error = ${error}`);
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
          debug(`caught sharding table error = ${error}`);
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
   * @param {ZipkinBase} zipkin optonal ZipkinProxy import by SASDN-Zipkin
   * @param {object} ctx optional koa or grpc context
   * @param {string} outputPath which path to create ConnectionMap.json
   */
  async initialize(option: DatabaseOptions, outputPath?: string): Promise<LibOrmConnection[]> {
    const entitySet: Set<string> = new Set();
    if (option.needCheckShard) {
      for (const connectionOption of option.connectionList) {
        for (const entity of connectionOption.entities) {
          await this._checkShardTable(entity, entitySet);
        }
      }
    }
    debug('Check ShardTable finish');
    const connections = await LibOrmCreateConnections(option.connectionList);
    debug('Create connection finish');
    const connMap: any = {};
    if (option.shardingStrategies) {
      for (const strategy of option.shardingStrategies) {
        if (!LibOrmGetConnectionManager().has(strategy.connctionName)) {
          throw new Error('There is no such ConnectionName in ShardingStrategy');
        }
        for (const entityName of strategy.entities) {
          if (!entitySet.has(entityName)) {
            throw new Error('There is no such EntityName in ShardingStrategy');
          }
          this.entityToConnection[entityName] = strategy.connctionName;
        }
        connMap[strategy.connctionName] = strategy.entities;
      }
      debug('Read custom ShardingStrategy finish');
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
      debug('Use default ShardingStrategy finish');
    }
    // if given outputPath then will write ConnectionMap to show [ connection => Entity ]
    if (outputPath && LibFs.statSync(outputPath).isDirectory()) {
      LibFs.writeFileSync(LibPath.join(outputPath, 'ConnectionMap.json')
        ,                 JSON.stringify(connMap, null, 2));
    } else {
      debug(`Currect ConnectionMap = ${JSON.stringify(connMap, null, 2)}`);
    }
    return connections;
  }

  /**
   * Return Connection by Entity
   * @param {BaseOrmEntity} entity
   */
  getConnection<T extends LibOrmBaseEntity>(entity: LibOrmObjectType<T>): LibOrmConnection {
    const connectionName = this.entityToConnection[(entity as any).name];
    let conn = LibOrmGetConnectionManager().get(connectionName);
    if(this._zipkin !== undefined && this._context !== undefined) {
      return this._zipkin.createClient(conn, this._context);
    }
    return conn;
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
      className = shardKey ? this.shardHashMap[className].get(shardKey) : `${className}_0`;
    }
    const filePath = EntityStorage.instance.shardTableFileStorage[className];
    if (filePath === undefined) {
      throw new Error(`Can not found a Entity with name: ${className}`);
    }
    if (!this._classMap[className]) {
      this._classMap[className] = require(filePath)[className];
      if (!this._classMap[className]) {
        throw new Error(`Can not require this Entity with name: ${className}`);
      }
    }
    return this._classMap[className];
  }
}
