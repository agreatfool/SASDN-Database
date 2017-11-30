import { Connection, createConnections, DatabaseType } from 'typeorm';
import { ClusterOptions } from './typeorm/ClusterOptions';
import { crc32 } from 'crc';

export class DatabaseFactory {

  protected readonly clusters: Map<string, Connection[]> = new Map();

  private static _instance: DatabaseFactory;

  static get instance(): DatabaseFactory {
    if(this._instance === undefined) {
      this._instance = new DatabaseFactory();
    }
    return this._instance;
  }

  /**
   * Create Database cluster by options
   * @param options array of ClusterOptions
   */
  async createClusterConnections(options: Array<ClusterOptions>): Promise<Map<string, Connection[]>> {
    const clusters = this.clusters;
    try {
      for (let cluster of options) {
        clusters.set(cluster.name, await createConnections(cluster.cluster));
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
      Math.abs(parseInt(crc32(shardKey).toString(), 16)) % cluster.length : 0;
    return cluster[index];
  }
}