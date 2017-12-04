"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ShardTableStorage_1 = require("./ShardTableStorage");
/**
 * ShardTable Decorate
 * @param tablePath    use __filename
 * @param shardCount   shard table count
 */
function shardTable(tablePath, shardCount) {
    return (target) => {
        const args = {
            tablePath: tablePath,
            className: target.name,
            shardCount: shardCount
        };
        ShardTableStorage_1.shardTableMetadataStorage().set(target.name, args);
    };
}
exports.shardTable = shardTable;
