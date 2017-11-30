import { Connection, createConnections, DatabaseType } from 'typeorm';
import { ClusterOptions } from './typeorm/ClusterOptions';
import { crc32 } from 'crc';

interface DatabaseCluster {
  /**
   * Database name.
   */
  name: string;

  /**
   *  Database type.
   */
  type: DatabaseType;

  /**
   * cluster connections
   */
  connections: Array<Connection>;
}

export class DatabaseFactory {
  // -------------------------------------------------------------------------
  // Protected Properties
  // -------------------------------------------------------------------------
  protected readonly clusters: Map<string, Connection[]> = new Map();
  // -------------------------------------------------------------------------
  // Private Static Properties
  // -------------------------------------------------------------------------
  private static _instance: DatabaseFactory;
  // -------------------------------------------------------------------------
  // Public Static Methods
  // -------------------------------------------------------------------------
  static get instance(): DatabaseFactory {
    if(this._instance === undefined) {
      this._instance = new DatabaseFactory();
    }
    return this._instance;
  }
  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * create Database cluster by options
   * @param options array of ClusterOptions
   */
  async createClusterConnections(options: Array<ClusterOptions>): Promise<Map<string, Connection[]>> {
    const clusters = this.clusters;
    try {
      for (let cluster of options) {
        let dbCluster: DatabaseCluster = {
          name: cluster.name,
          type: cluster.type,
          connections: await createConnections(cluster.cluster)
        }
        clusters.set(dbCluster.name, dbCluster.connections);
      }
    } catch (error) {
      throw error;
    }
    return clusters;
  }

  /**
   * return Connection by optional shardkey and databaseName
   * @param shardKey 
   * @param databaseName 
   */
  getShardConnection(shardKey?: string, databaseName?: string): Connection {
    const clusters = this.clusters;
    if (clusters.size <= 0) {
      throw new Error('there is no connection cluster here');
    }
    if (databaseName && !clusters.has(databaseName)) {
      throw new Error('can not found such DatabaseName');
    }
    const cluster: Connection[] = databaseName ?
       clusters.get(databaseName) : [...clusters.values()][0];
    const index: number = shardKey ?
      Math.abs(parseInt(crc32(String(shardKey)), 16)) % cluster.length : 0;
    return cluster[index];
  }
}