/**
 * Declare which Entity in which Connection.
 */
export interface ShardingStrategyInterface {
  /**
   * Connection Name.
   */
  connctionName: string;

  /**
   * Entity in this connection.
   */
  entities: string[];
}
