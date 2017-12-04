import ShardTableMetadataArgs from './ShardTableMetadataArgs';

function getGlobal(): any {
  return global;
}

/**
 * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
 */
export function shardTableMetadataStorage(): Map<string, ShardTableMetadataArgs> {
  const globalSpace = getGlobal();
  if (!globalSpace.shardTableMetadataStorage) {
    globalSpace.shardTableMetadataStorage = new Map<string, ShardTableMetadataArgs>();
  }
  return globalSpace.shardTableMetadataStorage;
}

/**
 * Use global space to storage ShardTableFileMap: <className, absolutePath>
 */
export function shardTableFileStorage(): Map<string, string> {
  const globalSpace = getGlobal();
  if (!globalSpace.shardTableFileStorage) {
    globalSpace.shardTableFileStorage = new Map<string, string>();
  }
  return globalSpace.shardTableFileStorage;
}