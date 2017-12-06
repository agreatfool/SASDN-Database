import { ShardTableMetadataArgs } from './ShardTableMetadataArgs';

export class EntityStorage {
  private static _instance: EntityStorage;

  protected argsMap: Map<string, ShardTableMetadataArgs> = new Map();

  protected filesMap: Map<string, string> = new Map();

  static get instance(): EntityStorage {
    if (this._instance === undefined) {
      this._instance = new EntityStorage();
    }
    return this._instance;
  }

  /**
  * Use global space to storage ShardTableMetadataMap: <className, ShardTableMetadataArgs>
  */
  shardTableMetadataStorage(): Map<string, ShardTableMetadataArgs> {
    return this.argsMap;
  }

  /**
   * Use global space to storage ShardTableFileMap: <className, absolutePath>
   */
  shardTableFileStorage(): Map<string, string> {
    return this.filesMap;
  }
}

