import { ShardTableMetadataArgs } from './interface/ShardTableMetadataArgs';

export class EntityStorage {
  private static _instance: EntityStorage;

  private _argsMap: { [key: string]: ShardTableMetadataArgs } = {};

  private _filesMap: { [key: string]: string } = {};

  static get instance(): EntityStorage {
    if (this._instance === undefined) {
      this._instance = new EntityStorage();
    }
    return this._instance;
  }

  /**
  * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
  */
  get shardTableMetadataStorage(): { [key: string]: ShardTableMetadataArgs } {
    return this._argsMap;
  }

  /**
   * Use global space to storage ShardTableFileMap: <className, absolutePath>
   */
  get shardTableFileStorage(): { [key: string]: string } {
    return this._filesMap;
  }
}

