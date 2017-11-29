import { DatabaseType, ConnectionOptions } from "typeorm";

export interface ClusterOptions {

  /**
   * Database name.
   */
  readonly name: string;

  /**
   * Database type.
   */
  readonly type: DatabaseType;

  /**
   * Database cluster.
   */
  readonly cluster: Array<ConnectionOptions>;
}