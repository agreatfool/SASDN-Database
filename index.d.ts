import { 
  BaseEntity, 
  ObjectType, 
  Repository, 
  Connection, 
  FindOneOptions, 
  DatabaseType, 
  ConnectionOptions 
} from 'typeorm';
import { DeepPartial } from 'typeorm/common/DeepPartial';

export interface ClusterOptions {
  /**
   * Database name.
   */
  readonly name: string;
  /**
   *  Database type.
   */
  readonly type: DatabaseType;
  /**
   * cluster connections
   */
  readonly cluster: Array<ConnectionOptions>;
}

export declare class DatabaseFactory {
  static get instance(): DatabaseFactory;

  /**
   * create Database cluster by options
   * @param options array of ClusterOptions
   */
  async createClusterConnections(options: Array<ClusterOptions>): Promise<Map<string, Connection[]>>;

  /**
   * return Connection by optional shardkey and databaseName
   * @param shardKey 
   * @param databaseName 
   */
  getShardConnection(shardKey?: string, databaseName?: string): Connection;
}

export declare class BaseShardEntity extends BaseEntity {
  constructor(shardKey?: string | number, databaseName?: string);

  /**
   * Saves current entity in the database.
   * If entity does not exist in the database then inserts, otherwise updates.
   */
  save(): Promise<this>;
  
  /**
   * Removes current entity from the database.
   */ 
  remove(): Promive<this>;

  /**
   * Gets current entity's Repository.
   */
  static getRepository<T extends BaseEntity>(this: ObjectType<T>,
    shardKey?: string | number, databaseName?: string): Repository<T>;

  /**
   * Finds first entity that matches given conditions.
   */
  static findOne<T extends BaseEntity>(this: ObjectType<T>,
    optionsOrConditions?: FindOneOptions<T> | DeepPartial<T>,
    shardKey?: string | number, databaseName?: string): Promise<T | undefined>;

  /**
   * Finds entity by given id.
   * Optionally find options or conditions can be applied.
   */
  static findOneById<T extends BaseEntity>(this: ObjectType<T>,
    id: any, optionsOrConditions?: FindOneOptions<T> | DeepPartial<T>,
    shardKey?: string | number, databaseName?: string): Promise<T | undefined>;
}