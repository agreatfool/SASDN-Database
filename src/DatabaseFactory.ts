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
    return this._instance || new DatabaseFactory();
  }
  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * create Database cluster
   * @param options array of ClusterOptions
   */
  async createClusterConnections(options: Array<ClusterOptions>): Promise<Map<string, Connection[]>> {
    try {
      for (let cluster of options) {
        let dbCluster: DatabaseCluster = {
          name: cluster.name,
          type: cluster.type,
          connections: await createConnections(cluster.cluster)
        }
        this.clusters.set(dbCluster.name, dbCluster.connections);
      }
    } catch (error) {
      throw error;
    }
    return this.clusters;
  }

  /**
   * 
   * @param shardKey 
   * @param databaseName 
   */
  getShardConnection(shardKey?: string, databaseName?: string): Connection {
    if (this.clusters.size <= 0) {
      throw new Error('there is no connection cluster here');
    }
    if (databaseName && !this.clusters.has(databaseName)) {
      throw new Error('can not found such DatabaseName');
    }
    const cluster: Connection[] = databaseName ?
       this.clusters.get(databaseName) : [...this.clusters.values()][0];
    const index: number = shardKey ?
      Math.abs(parseInt(crc32(String(shardKey)), 16)) % cluster.length : 0;
    return cluster[index];
  }
}