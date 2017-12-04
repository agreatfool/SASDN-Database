import { BaseEntity, ObjectType, Repository, Connection, FindOneOptions } from 'typeorm';
import { DatabaseFactory } from '../DatabaseFactory';
import { DeepPartial } from 'typeorm/common/DeepPartial';

/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export class BaseShardEntity extends BaseEntity {

  private _shardKey: string | number;

  private _databaseName: string;

  constructor(shardKey?: string | number, databaseName?: string) {
    super();
    this._shardKey = shardKey || null;
    this._databaseName = databaseName || null;
  }

  /**
   * Saves current entity in the database.
   * If entity does not exist in the database then inserts, otherwise updates.
   */
  save(): Promise<this> {
    return (this.constructor as any).getRepository(this._shardKey, this._databaseName).save(this);
  }

  /**
   * Removes current entity from the database.
   */
  remove(): Promise<this> {
    return (this.constructor as any).getRepository(this._shardKey, this._databaseName).remove(this);
  }

  /**
   * Gets current entity's Repository.
   */
  static getRepository<T extends BaseEntity>(this: ObjectType<T>,
                                             shardKey?: string | number, databaseName?: string): Repository<T> {
    const connection: Connection = DatabaseFactory.instance.getShardConnection(shardKey.toString(), databaseName);
    return connection.getRepository<T>(this);
  }

  /**
   * Finds first entity that matches given conditions.
   */
  static findOne<T extends BaseEntity>(this: ObjectType<T>,
                                       optionsOrConditions?: FindOneOptions<T> | DeepPartial<T>,
                                       shardKey?: string | number, databaseName?: string): Promise<T | undefined> {
    return (this as any).getRepository(shardKey, databaseName).findOne(optionsOrConditions as any);
  }

  /**
   * Finds entity by given id.
   * Optionally find options or conditions can be applied.
   */
  static findOneById<T extends BaseEntity>(this: ObjectType<T>,
                                           id: any, optionsOrConditions?: FindOneOptions<T> | DeepPartial<T>,
                                           shardKey?: string | number, databaseName?: string): Promise<T | undefined> {
    return (this as any).getRepository(shardKey, databaseName).findOneById(id, optionsOrConditions as any);
  }
}