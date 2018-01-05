import { BaseEntity as LibOrmBaseEntity, Connection as LibOrmConnection, ObjectType as LibOrmObjectType } from 'typeorm';
import { DatabaseOptions } from './interface/DatabaseOptions';
import { ZipkinBase } from 'sasdn-zipkin';
export declare class DatabaseFactory {
    private static _instance;
    private readonly _entityToConnection;
    private readonly _shardHashMap;
    private _zipkin;
    private _context;
    static readonly instance: DatabaseFactory;
    readonly shardHashMap: {
        [key: string]: any;
    };
    readonly entityToConnection: {
        [key: string]: string;
    };
    context: object;
    /**
     * Read given path to find ShardTable then copy & rewrite shardTableEntity
     * @param {string | Function} entityPath
     * @param {Set<string>} classSet
     */
    private _checkShardTable(entityPath, classSet);
    /**
     * Create Database by option
     * @param {DatabaseOptions} option DatabaseOptions
     * @param {ZipkinBase} zipkin optonal ZipkinProxy import by SASDN-Zipkin
     * @param {object} ctx optional koa or grpc context
     * @param {string} outputPath which path to create ConnectionMap.json
     */
    initialize(option: DatabaseOptions, zipkin?: ZipkinBase, ctx?: object, outputPath?: string): Promise<LibOrmConnection[]>;
    /**
     * Return Connection by Entity
     * @param {BaseOrmEntity} entity
     */
    getConnection<T extends LibOrmBaseEntity>(entity: LibOrmObjectType<T>): LibOrmConnection;
    /**
     * Get Entity by given className & shardKey
     * @param {string | Function} entity
     * @param {string | number} shardKey
     */
    getEntity(entity: string | Function, shardKey?: string | number): any;
}
