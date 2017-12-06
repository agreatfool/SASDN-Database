"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class EntityStorage {
    constructor() {
        this.argsMap = new Map();
        this.filesMap = new Map();
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
    shardTableMetadataStorage() {
        return this.argsMap;
    }
    /**
     * Use global space to storage ShardTableFileMap: <className, absolutePath>
     */
    shardTableFileStorage() {
        return this.filesMap;
    }
}
exports.default = EntityStorage;
