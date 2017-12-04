export default interface ShardTableMetadataArgs {
  /**
   * Table Path.
   */
  tablePath: string;
  /**
   * ClassName get by decorate
   */
  className: string;
  /**
   * Table shard count
   */
  shardCount: number;
}