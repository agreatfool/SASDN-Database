import ShardTableMetadataArgs from './ShardTableMetadataArgs';
import { shardTableMetadataStorage } from './ShardTableStorage';

/**
 * ShardTable Decorate
 * @param tablePath    use __filename
 * @param shardCount   shard table count
 */
export function shardTable(tablePath: string, shardCount: number): Function {
  return (target: any) => {
    const args: ShardTableMetadataArgs = {
      tablePath: tablePath,
      className: target.name,
      shardCount: shardCount
    };
    shardTableMetadataStorage().set(target.name, args);
  };
}