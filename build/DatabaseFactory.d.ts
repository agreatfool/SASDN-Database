import { Connection } from 'typeorm';
import { ClusterOptions } from './typeorm/ClusterOptions';
export declare class DatabaseFactory {
    protected readonly clusters: Map<string, Connection[]>;
    private static _instance;
    static readonly instance: DatabaseFactory;
    /**
     * create Database cluster by options
     * @param options array of ClusterOptions
     */
    createClusterConnections(options: Array<ClusterOptions>): Promise<Map<string, Connection[]>>;
    /**
     * return Connection by optional shardkey and databaseName
     * @param shardKey
     * @param databaseName
     */
    getShardConnection(shardKey?: string, databaseName?: string): Connection;
}
