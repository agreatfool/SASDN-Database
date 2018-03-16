import { BaseEntity, Connection, ConnectionOptions, DatabaseType, ObjectType, Repository } from 'typeorm';
import { ZipkinBase } from 'sasdn-zipkin';

/**
 * Declare which Entity in which Connection.
 */
export interface ShardingStrategyInterface {
  /**
   * Connection Name.
   */
  connctionName: string;
  /**
   * Entity in this connection.
   */
  entities: string[];
}

export interface ShardTableMetadataArgs {
  /**
   * ClassName get by decorate
   */
  className: string;
  /**
   * Table shard count
   */
  shardCount: number;
}

export interface DatabaseOptions {
  /**
   * Database name.
   */
  readonly name: string;
  /**
   * Database type.
   */
  readonly type: DatabaseType;
  /**
   * Need check shard table or not
   */
  readonly needCheckShard?: boolean;
  /**
   * Database cluster.
   */
  readonly connectionList: ConnectionOptions[];
  /**
   * If not define then use default ShardingStrategy(mod)
   */
  shardingStrategies?: ShardingStrategyInterface[];
}

/**
 * ShardTable Decorate
 * @param shardCount   shard table count
 */
export declare function ShardTable(shardCount: number): Function;

/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export declare class BaseOrmEntity extends BaseEntity {
  /**
   * Gets current entity's Repository.
   */
  static getRepository<T extends BaseEntity>(this: ObjectType<T>): Repository<T>;
}

export declare class EntityStorage {
  private static _instance;
  private _argsMap;
  private _filesMap;
  static readonly instance: EntityStorage;
  /**
   * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
   */
  readonly shardTableMetadataStorage: {
    [key: string]: ShardTableMetadataArgs;
  };
  /**
   * Use global space to storage ShardTableFileMap: <className, absolutePath>
   */
  readonly shardTableFileStorage: {
    [key: string]: string;
  };
}

export declare class DatabaseFactory {
  private static _instance;
  private readonly _entityToConnection;
  private readonly _shardHashMap;
  private readonly _classMap;
  static readonly instance: DatabaseFactory;
  readonly shardHashMap: {
    [key: string]: any;
  };
  readonly entityToConnection: {
    [key: string]: string;
  };

  updateZipkin(zipkin: ZipkinBase, ctx: object): void;

  /**
   * Read given path to find ShardTable then copy & rewrite shardTableEntity
   * @param {string | Function} entityPath
   * @param {Set<string>} classSet
   */
  private _checkShardTable(entityPath, classSet);

  /**
   * Create Database by option
   * @param {DatabaseOptions} option DatabaseOptions
   * @param {ZipkinBase} zipkin optonal ZipkinProxy import by SASDN-Zipkin
   * @param {object} ctx optional koa or grpc context
   * @param {string} outputPath which path to create ConnectionMap.json
   */
  initialize(option: DatabaseOptions, zipkin?: ZipkinBase, ctx?: object, outputPath?: string): Promise<Connection[]>;

  /**
   * Return Connection by Entity
   * @param {BaseOrmEntity} entity
   */
  getConnection<T extends BaseEntity>(entity: ObjectType<T>): Connection;

  /**
   * Get Entity by given className & shardKey
   * @param {string | Function} entity
   * @param {string | number} shardKey
   */
  getEntity(entity: string | Function, shardKey?: string | number): any;
}