import { 
  BaseEntity, 
  Connection, 
  ObjectType,
  Repository,
  DatabaseType,
  ConnectionOptions,
} from 'typeorm';

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
   * Database cluster.
   */
  readonly optionList: ConnectionOptions[];
  /**
   * If not define then use default ShardingStrategy(mod)
   */
  shardingStrategies?: ShardingStrategyInterface[];
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

/**
 * ShardTable Decorate
 * @param shardCount   shard table count
 */
export declare function shardTable(shardCount: number): Function;

export class EntityStorage {
  private static _instance;
  protected argsMap: Map<string, ShardTableMetadataArgs>;
  protected filesMap: Map<string, string>;
  static readonly instance: EntityStorage;
  /**
  * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
  */
  shardTableMetadataStorage(): Map<string, ShardTableMetadataArgs>;
  /**
   * Use global space to storage ShardTableFileMap: <className, absolutePath>
   */
  shardTableFileStorage(): Map<string, string>;
}


/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export declare class BaseOrmEntity extends BaseEntity {
  /**
   * Gets current entity's Repository.
   */
  static getRepository<T extends BaseEntity>(this: ObjectType<T>): Repository<T>;
}

export declare class DatabaseFactory {
    protected readonly databaseEntitiesMap: Map<string, string>;
    private static _instance;
    private _hashringMap;
    static readonly instance: DatabaseFactory;
    readonly hashringMap: Map<string, any>;
    /**
     * Read given path to find ShardTable then copy & rewrite shardTableEntity
     * @param entityPath
     */
    private checkShardTable(entityPath, classSet);
    /**
     * Create Database by options
     * @param options array of ClusterOptions
     * @param outputPath which path to create ConnectionMap.json
     */
    createDatabaseConnections(option: DatabaseOptions, outputPath?: string): Promise<any>;
    /**
     * Return Connection by optional shardkey and databaseName
     */
    getConnection<T extends BaseEntity>(entity: ObjectType<T>): Connection;
    /**
     * Get ShardEntity by className & shardKey
     * @param entity
     * @param shardKey
     */
    getEntity(entity: string | Function, shardKey?: string | number): any;
}
