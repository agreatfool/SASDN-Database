import { DatabaseType, ConnectionOptions } from 'typeorm';
import { ShardingStrategyInterface } from './ShardingStrategyInterface';

export interface DatabaseOptions {

  /**
   * Database name.
   */
  readonly name: string;

  /**
   * Database type.
   */
  readonly type: DatabaseType;

  /**
   * Need check shard table or not
   */
  readonly needCheckShard?: boolean;

  /**
   * Database cluster.
   */
  readonly connectionList: ConnectionOptions[];
  
  /**
   * If not define then use default ShardingStrategy(mod)
   */
  shardingStrategies?: ShardingStrategyInterface[];
}
