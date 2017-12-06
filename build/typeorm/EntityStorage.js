"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EntityStorage {
    constructor() {
        this._argsMap = {};
        this._filesMap = {};
    }
    static get instance() {
        if (this._instance === undefined) {
            this._instance = new EntityStorage();
        }
        return this._instance;
    }
    /**
    * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
    */
    get shardTableMetadataStorage() {
        return this._argsMap;
    }
    /**
     * Use global space to storage ShardTableFileMap: <className, absolutePath>
     */
    get shardTableFileStorage() {
        return this._filesMap;
    }
}
exports.EntityStorage = EntityStorage;
