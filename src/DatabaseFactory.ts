import { Connection, createConnections, DatabaseType, ConnectionOptions } from 'typeorm';
import { ClusterOptions } from './typeorm/ClusterOptions';
import { crc32 } from 'crc';
import * as LibFs from 'mz/fs';
import * as LibPath from 'path';
const glob = require('glob');

export class DatabaseFactory {

  protected readonly clusters: Map<string, Connection[]> = new Map();

  private static _instance: DatabaseFactory;

  static get instance(): DatabaseFactory {
    if (this._instance === undefined) {
      this._instance = new DatabaseFactory();
    }
    return this._instance;
  }

  /**
   * Read given path to find ShardTable then copy & rewrite shardTableEntity
   * @param entityPath 
   */
  async checkShardTable(entityPath: string | Function): Promise<any> {
  if(typeof(entityPath) === 'function') {
    return;
  }
  try {
    let files = glob.sync(entityPath);
    for (const file of files) {
      const fileNameExp = /[a-zA-Z0-9]+.js/;
      const copyExp = /[a-zA-Z0-9]+_[0-9]+.js/;
      const copyMatch = copyExp.exec(file);
      if (copyMatch) {
        continue;
      }
      const fileNameMatch = fileNameExp.exec(file)[0];
      const fileName = fileNameMatch.substring(0, fileNameMatch.length - 3);
      const givenPath = entityPath.split('*')[0];
      const context = await LibFs.readFileSync(file, 'utf-8');
      const regExp: RegExp = new RegExp(/\.shardTable\(__filename\,\s[0-9]+\)/);
      const matchResult: string[] = regExp.exec(context);
      if (!matchResult)
        continue;
      const tablePath = LibPath.join(givenPath, `/shardTables/`);
      try {
        await LibFs.stat(tablePath);
      } catch (error) {
        await LibFs.mkdir(tablePath);
      }
      const matchText = matchResult[0];
      const numExp: RegExp = new RegExp(/[0-9]+/);
      let numberMatch: number = parseInt(numExp.exec(matchText)[0]);
      const classExp: RegExp = new RegExp(/class\s\b[A-Za-z0-9]+\b/);
      const className = classExp.exec(context)[0].replace('class ', '');
      for (let i = 0; i < numberMatch; i++) {
        try {
          const newFilePath = `${givenPath}/shardTables/${fileName}_${i}.js`;
          try {
            await LibFs.stat(newFilePath);
          } catch (error) {
            await LibFs.copyFileSync(file, newFilePath, LibFs.constants.COPYFILE_EXCL);
          }
          const readFile = await LibFs.readFileSync(file, 'utf-8');
          const newClassName = `${className}_${i}`;
          await LibFs.writeFile(newFilePath, readFile.replace(new RegExp(className, 'gm'), newClassName));
        } catch (error) {
          console.log('caught error = ', error);
          return;
        }
      }
    }
  } catch (error) {
    console.log('caught error = ', error);
    return;
  }
}

/**
 * Create Database cluster by options
 * @param options array of ClusterOptions
 */
async createClusterConnections(options: Array<ClusterOptions>): Promise < Map < string, Connection[] >> {
  const clusters = this.clusters;
  try {
    for(let cluster of options) {
      cluster.cluster.forEach(options => {
        (options.entities as any[]).forEach(entity => {
          this.checkShardTable(entity);
        });
      });
      clusters.set(cluster.name, await createConnections(cluster.cluster));
    }
  } catch(error) {
    throw error;
  }
    return clusters;
}

  /**
   * return Connection by optional shardkey and databaseName
   * @param shardKey 
   * @param databaseName 
   */
  getShardConnection(shardKey ?: string, databaseName ?: string): Connection {
    const clusters = this.clusters;
    if(clusters.size <= 0) {
      throw new Error('there is no connection cluster here');
    }
    if(databaseName && !clusters.has(databaseName)) {
      throw new Error('can not found such DatabaseName');
    }
    const cluster: Connection[] = databaseName ?
      clusters.get(databaseName) : [...clusters.values()][0];
    const index: number = shardKey ?
      Math.abs(parseInt(crc32(shardKey).toString(), 16)) % cluster.length : 0;
    return cluster[index];
  }
}