import {
  BaseEntity,
  Connection,
  createConnections,
  DatabaseType,
  getConnectionManager,
  ObjectType,
} from 'typeorm';
import { DatabaseOptions } from './typeorm/DatabaseOptions';
import { EntityStorage } from './typeorm/EntityStorage';
import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
import { ToolUtils } from './ToolUtils';
import { glob } from 'glob';
var HashRing = require('hashring');

export class DatabaseFactory {

  // Find connection by Entity's class name. Map<className, connectionName>
  protected readonly databaseEntitiesMap: Map<string, string> = new Map();

  private static _instance: DatabaseFactory;

  private _hashringMap: Map<string, any> = new Map();

  static get instance(): DatabaseFactory {
    if (this._instance === undefined) {
      this._instance = new DatabaseFactory();
    }
    return this._instance;
  }

  get hashringMap(): Map<string, any> {
    return this._hashringMap;
  }

  /**
   * Read given path to find ShardTable then copy & rewrite shardTableEntity
   * @param entityPath
   */
  private async checkShardTable(entityPath: string | Function,
    classSet: Set<string>): Promise<any> {
    if (typeof (entityPath) === 'function') {
      return;
    }
    try {
      const files = glob.sync(entityPath);
      const storage = EntityStorage.instance;
      for (const file of files) {
        const copyExp = /[a-zA-Z0-9]+_[0-9]+.js/;
        const copyMatch = copyExp.exec(file);
        if (copyMatch) {
          try {
            if (LibFs.statSync(file).isFile()) {
              LibFs.unlinkSync(file);
            }
          } catch (error) {
            console.log('caught error by unlink copy file = ', error);
          }
          continue;
        }
        // find fileName
        const fileBaseName = LibPath.basename(file);
        const fileName = fileBaseName.substring(0, fileBaseName.length - 3);
        const rootPath = file.substring(0, file.length - fileBaseName.length);
        const content = LibFs.readFileSync(file, 'utf-8');
        const classNameMatch = await ToolUtils.regExec(content, /class\s\b[A-Za-z0-9]+\b/);
        const className = classNameMatch.replace('class ', '');
        classSet.add(className);
        storage.shardTableFileStorage().set(className, file);
        // find base path
        try {
          const matchText = await ToolUtils.regExec(content, /\.shardTable\([0-9]+\)/);
          classSet.delete(className);
          const numberMatch = await ToolUtils.regExec(matchText, /[0-9]+/);
          // find shard count
          const shardCount: number = parseInt(numberMatch, 10);
          // find class name
          const classHash = new HashRing();
          for (let i = 0; i < shardCount; i++) {
            try {
              const newFileName = `${fileName}_${i}`;
              const newFilePath = LibPath.join(rootPath, `${newFileName}.js`);
              LibFs.copyFileSync(file, newFilePath, LibFs.constants.COPYFILE_EXCL);
              const newClassName = `${className}_${i}`;
              classHash.add(newClassName);
              classSet.add(newClassName);
              const snakeCaseTableName = ToolUtils.snakeCase(newClassName);
              const tableNameExp: RegExp = new RegExp(/\.Entity\(\'\S+\'\)/);
              let newContent = content.replace(new RegExp(className, 'gm'), newClassName);
              newContent = newContent.replace(tableNameExp, `.Entity('${snakeCaseTableName}')`);
              LibFs.writeFileSync(newFilePath, newContent);
              storage.shardTableFileStorage().set(newClassName, newFilePath);
            } catch (error) {
              //console.log('caught sharding table error = ', error);
              continue;
            }
          }
          this.hashringMap.set(className, classHash);
        } catch (error) {
          //console.log('caught finding table error = ', error);
          continue;
        }
      }
    } catch (error) {
      //console.log('caught finding file error = ', error);
      return;
    }
    return this.hashringMap;
  }

  /**
   * Create Database by options
   * @param options array of ClusterOptions
   * @param outputPath which path to create ConnectionMap.json
   */
  async createDatabaseConnections(option: DatabaseOptions, outputPath?: string): Promise<any> {
    try {
      const entitySet: Set<string> = new Set();
      for (const opts of option.optionList) {
        for (const entity of opts.entities) {
          await this.checkShardTable(entity, entitySet);
        }
      }
      const connections = await createConnections(option.optionList);
      const connMap: any = {};
      if (option.shardingStrategies) {
        for (const strategy of option.shardingStrategies) {
          if (!getConnectionManager().has(strategy.connctionName)) {
            throw new Error('There is no such ConnectionName in ShardingStrategy');
          }
          for (const etyname of strategy.entities) {
            if (!entitySet.has(etyname)) {
              throw new Error('There is no such EntityName in ShardingStrategy');
            }
            this.databaseEntitiesMap.set(etyname, strategy.connctionName);
          }
          connMap[strategy.connctionName] = strategy.entities;
        }
      } else {
        const entitiesClass = [...entitySet];
        for (let i = 0; i < entitiesClass.length; i++) {
          const index = (i + connections.length) % connections.length;
          const connName = connections[index].name;
          const className = entitiesClass[i];
          this.databaseEntitiesMap.set(className, connName);
          if (connMap[connName] === undefined) {
            connMap[connName] = [];
          }
          (connMap[connName] as string[]).push(className);
        }
      }
      if (outputPath && LibFs.statSync(outputPath).isDirectory()) {
        LibFs.writeFileSync(LibPath.join(outputPath, 'ConnectionMap.json')
          , JSON.stringify(connMap));
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Return Connection by optional shardkey and databaseName
   */
  getConnection<T extends BaseEntity>(entity: ObjectType<T>): Connection {
    const connectionName = this.databaseEntitiesMap.get((entity as any).name);
    return getConnectionManager().get(connectionName);
  }

  /**
   * Get ShardEntity by className & shardKey
   * @param entity
   * @param shardKey
   */
  getEntity(entity: string | Function, shardKey?: string | number): any {
    const storage = EntityStorage.instance;
    let className = typeof (entity) === 'function' ? entity.constructor.name : entity;
    const args = storage.shardTableMetadataStorage().get(className);
    if (args) {
      if (shardKey === undefined) {
        shardKey = '';
      }
      className = this.hashringMap.get(className).get(shardKey);
    }
    return require(storage.shardTableFileStorage().get(className))[className];
  }
}
