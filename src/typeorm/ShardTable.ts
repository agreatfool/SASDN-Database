import { ShardTableMetadataArgs } from './ShardTableMetadataArgs';
import { EntityStorage } from './EntityStorage';

/**
 * ShardTable Decorate
 * @param shardCount   shard table count
 */
export function shardTable(shardCount: number): Function {
  return (target: any) => {
    const args: ShardTableMetadataArgs = {
      className: target.name,
      shardCount,
    };
    EntityStorage.instance.shardTableMetadataStorage().set(target.name, args);
  };
}
