import { BaseEntity, ObjectType, Repository, Connection } from 'typeorm';
import { DatabaseFactory } from './DatabaseFactory';

/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export class BaseOrmEntity extends BaseEntity {
  /**
   * Gets current entity's Repository.
   */
  static getRepository<T extends BaseEntity>(this: ObjectType<T>): Repository<T> {
    const connection: Connection = DatabaseFactory.instance.getConnection(this);
    return connection.getRepository<T>(this);
  }
}
