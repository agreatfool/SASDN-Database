"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const DatabaseFactory_1 = require("../DatabaseFactory");
/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
class BaseOrmEntity extends typeorm_1.BaseEntity {
    /**
     * Gets current entity's Repository.
     */
    static getRepository() {
        const factory = DatabaseFactory_1.DatabaseFactory.instance;
        const connection = factory.getConnection(this);
        return connection.getRepository(this);
    }
}
exports.BaseOrmEntity = BaseOrmEntity;
