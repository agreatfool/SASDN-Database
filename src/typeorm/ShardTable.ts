import { ShardTableMetadataArgs } from './interface/ShardTableMetadataArgs';
import { EntityStorage } from './EntityStorage';

/**
 * ShardTable Decorate
 * @param shardCount   shard table count
 */
export function ShardTable(shardCount: number): Function {
  return (target: any) => {
    const args: ShardTableMetadataArgs = {
      className: target.name,
      shardCount,
    };
    EntityStorage.instance.shardTableMetadataStorage[target.name] = args;
  };
}
