"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const DatabaseFactory_1 = require("../DatabaseFactory");
/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
class BaseShardEntity extends typeorm_1.BaseEntity {
    constructor(shardKey, databaseName) {
        super();
        this._shardKey = shardKey || null;
        this._databaseName = databaseName || null;
    }
    /**
     * Saves current entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save() {
        return this.constructor.getRepository(this._shardKey, this._databaseName).save(this);
    }
    /**
     * Removes current entity from the database.
     */
    remove() {
        return this.constructor.getRepository(this._shardKey, this._databaseName).remove(this);
    }
    /**
     * Gets current entity's Repository.
     */
    static getRepository(shardKey, databaseName) {
        const connection = DatabaseFactory_1.DatabaseFactory.instance.getShardConnection(shardKey.toString(), databaseName);
        return connection.getRepository(this);
    }
    /**
     * Finds first entity that matches given conditions.
     */
    static findOne(optionsOrConditions, shardKey, databaseName) {
        return this.getRepository(shardKey, databaseName).findOne(optionsOrConditions);
    }
    /**
     * Finds entity by given id.
     * Optionally find options or conditions can be applied.
     */
    static findOneById(id, optionsOrConditions, shardKey, databaseName) {
        return this.getRepository(shardKey, databaseName).findOneById(id, optionsOrConditions);
    }
}
exports.BaseShardEntity = BaseShardEntity;
