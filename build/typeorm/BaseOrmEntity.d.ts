import { BaseEntity, ObjectType, Repository } from 'typeorm';
/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export declare class BaseOrmEntity extends BaseEntity {
    /**
     * Gets current entity's Repository.
     */
    static getRepository<T extends BaseEntity>(this: ObjectType<T>): Repository<T>;
}
