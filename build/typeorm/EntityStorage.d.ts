import { ShardTableMetadataArgs } from './interface/ShardTableMetadataArgs';
export declare class EntityStorage {
    private static _instance;
    private _argsMap;
    private _filesMap;
    static readonly instance: EntityStorage;
    /**
    * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
    */
    readonly shardTableMetadataStorage: {
        [key: string]: ShardTableMetadataArgs;
    };
    /**
     * Use global space to storage ShardTableFileMap: <className, absolutePath>
     */
    readonly shardTableFileStorage: {
        [key: string]: string;
    };
}
