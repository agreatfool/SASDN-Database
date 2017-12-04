"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getGlobal() {
    return global;
}
/**
 * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
 */
function shardTableMetadataStorage() {
    const globalSpace = getGlobal();
    if (!globalSpace.shardTableMetadataStorage) {
        globalSpace.shardTableMetadataStorage = new Map();
    }
    return globalSpace.shardTableMetadataStorage;
}
exports.shardTableMetadataStorage = shardTableMetadataStorage;
/**
 * Use global space to storage ShardTableFileMap: <className, absolutePath>
 */
function shardTableFileStorage() {
    const globalSpace = getGlobal();
    if (!globalSpace.shardTableFileStorage) {
        globalSpace.shardTableFileStorage = new Map();
    }
    return globalSpace.shardTableFileStorage;
}
exports.shardTableFileStorage = shardTableFileStorage;
