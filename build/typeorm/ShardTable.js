"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntityStorage_1 = require("./EntityStorage");
/**
 * ShardTable Decorate
 * @param shardCount   shard table count
 */
function ShardTable(shardCount) {
    return (target) => {
        const args = {
            className: target.name,
            shardCount,
        };
        EntityStorage_1.EntityStorage.instance.shardTableMetadataStorage[target.name] = args;
    };
}
exports.ShardTable = ShardTable;
