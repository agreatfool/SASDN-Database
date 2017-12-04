import ShardTableMetadataArgs from "./ShardTableMetadataArgs";

function getGlobal(): any {
  return global;
}

/**
 * Use global space to storage ShardTableMetadata
 */
export function shardTableMetadataStorage(): Array<ShardTableMetadataArgs> {
  const globalSpace = getGlobal();
  if (!globalSpace.shardTableMetadataStorage) {
    globalSpace.shardTableMetadataStorage = [];
  }
  return globalSpace.shardTableMetadataStorage;
}