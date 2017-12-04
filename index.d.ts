import {
  BaseEntity,
  ObjectType,
  Repository,
  FindOneOptions,
  DatabaseType,
  Connection,
  ConnectionOptions,
} from 'typeorm';
import { DeepPartial } from 'typeorm/common/DeepPartial';

export interface ClusterOptions {
  /**
   * Database name.
   */
  readonly name: string;
  /**
   * Database type.
   */
  readonly type: DatabaseType;
  /**
   * Database cluster.
   */
  readonly cluster: Array<ConnectionOptions>;
}

export default interface ShardTableMetadataArgs
{
  /**
   * Table Path.
   */
  tablePath: string;
  /**
   * ClassName get by decorate
   */
  className: string;
  /**
   * Table shard count
   */
  shardCount: number;
}

/**
 * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
 */
export declare function shardTableMetadataStorage(): Map<string, ShardTableMetadataArgs>;

/**
 * Use global space to storage ShardTableFileMap: <className, absolutePath>
 */
export declare function shardTableFileStorage(): Map<string, string>;

/**
 * ShardTable Decorate
 * @param tablePath    use __filename
 * @param shardCount   shard table count
 */
export declare function shardTable(tablePath: string, shardCount: number): Function;

/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export declare class BaseShardEntity extends BaseEntity {
  private _shardKey;
  private _databaseName;

  constructor(shardKey?: string | number, databaseName?: string);

  /**
   * Saves current entity in the database.
   * If entity does not exist in the database then inserts, otherwise updates.
   */
  save(): Promise<this>;

  /**
   * Removes current entity from the database.
   */
  remove(): Promise<this>;

  /**
   * Gets current entity's Repository.
   */
  static getRepository<T extends BaseEntity>(this: ObjectType<T>, shardKey?: string | number, databaseName?: string): Repository<T>;

  /**
   * Finds first entity that matches given conditions.
   */
  static findOne<T extends BaseEntity>(this: ObjectType<T>, optionsOrConditions?: FindOneOptions<T> | DeepPartial<T>, shardKey?: string | number, databaseName?: string): Promise<T | undefined>;

  /**
   * Finds entity by given id.
   * Optionally find options or conditions can be applied.
   */
  static findOneById<T extends BaseEntity>(this: ObjectType<T>, id: any, optionsOrConditions?: FindOneOptions<T> | DeepPartial<T>, shardKey?: string | number, databaseName?: string): Promise<T | undefined>;
}

export declare class DatabaseFactory {
  protected readonly clusters: Map<string, Connection[]>;
  private static _instance;
  static readonly instance: DatabaseFactory;

  /**
   * Read given path to find ShardTable then copy & rewrite shardTableEntity
   * @param entityPath
   */
  checkShardTable(entityPath: string | Function): Promise<any>;

  /**
   * Create Database cluster by options
   * @param options array of ClusterOptions
   */
  createClusterConnections(options: Array<ClusterOptions>): Promise<Map<string, Connection[]>>;

  /**
   * return Connection by optional shardkey and databaseName
   * @param shardKey
   * @param databaseName
   */
  getShardConnection(shardKey?: string | number, databaseName?: string): Connection;

  /**
   * get ShardEntity by className & shardKey
   * @param className
   * @param shardKey
   * @param databaseName
   */
  getShardEntity(className: string, shardKey: string | number, databaseName?: string): any;
}