import { ShardTableMetadataArgs } from './interface/ShardTableMetadataArgs';
import { EntityStorage } from './EntityStorage';

/**
 * ShardTable Decorate
 * @param shardCount   shard table count
 */
export function ShardTable(shardCount: number): Function {
  return (target: any) => {
    const args: ShardTableMetadataArgs = {
      shardCount,
      className: target.name,
    };
    if (args.className.indexOf('_') < 0) {
      EntityStorage.instance.shardTableMetadataStorage[target.name] = args;
    }
  };
}
