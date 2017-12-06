"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EntityStorage_1 = require("./EntityStorage");
/**
 * ShardTable Decorate
 * @param shardCount   shard table count
 */
function shardTable(shardCount) {
    return (target) => {
        const args = {
            className: target.name,
            shardCount,
        };
        EntityStorage_1.default.instance.shardTableMetadataStorage().set(target.name, args);
    };
}
exports.shardTable = shardTable;
