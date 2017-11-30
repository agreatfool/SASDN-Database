import { BaseEntity, ObjectType, Repository, FindOneOptions } from 'typeorm';
import { DeepPartial } from 'typeorm/common/DeepPartial';
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
