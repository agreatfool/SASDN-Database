"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const ShardTableStorage_1 = require("./typeorm/ShardTableStorage");
const PlatformTools_1 = require("./PlatformTools");
const crc_1 = require("crc");
const LibFs = require("mz/fs");
const LibPath = require("path");
const glob = require('glob');
class DatabaseFactory {
    constructor() {
        this.clusters = new Map();
    }
    static get instance() {
        if (this._instance === undefined) {
            this._instance = new DatabaseFactory();
        }
        return this._instance;
    }
    /**
     * Read given path to find ShardTable then copy & rewrite shardTableEntity
     * @param entityPath
     */
    checkShardTable(entityPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof (entityPath) === 'function') {
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
                    const context = yield LibFs.readFileSync(file, 'utf-8');
                    const regExp = new RegExp(/\.shardTable\(__filename\,\s[0-9]+\)/);
                    const matchResult = regExp.exec(context);
                    if (!matchResult)
                        continue;
                    const tablePath = LibPath.join(givenPath, `/shardTables/`);
                    try {
                        yield LibFs.stat(tablePath);
                    }
                    catch (error) {
                        yield LibFs.mkdir(tablePath);
                    }
                    const matchText = matchResult[0];
                    const numExp = new RegExp(/[0-9]+/);
                    let numberMatch = parseInt(numExp.exec(matchText)[0]);
                    const classExp = new RegExp(/class\s\b[A-Za-z0-9]+\b/);
                    const className = classExp.exec(context)[0].replace('class ', '');
                    for (let i = 0; i < numberMatch; i++) {
                        try {
                            const newFilePath = LibPath.join(givenPath, `/shardTables/${fileName}_${i}.js`);
                            try {
                                yield LibFs.stat(newFilePath);
                            }
                            catch (error) {
                                yield LibFs.copyFileSync(file, newFilePath, LibFs.constants.COPYFILE_EXCL);
                            }
                            const readFileContent = yield LibFs.readFileSync(file, 'utf-8');
                            const newClassName = `${className}_${i}`;
                            const snakeCaseTableName = newClassName.replace(/(?:^|\.?)([A-Z])/g, (x, y) => "_" + y.toLowerCase()).replace(/^_/, "");
                            const tableNameExp = new RegExp(/\.Entity\(\'\S+\'\)/);
                            let content = readFileContent.replace(new RegExp(className, 'gm'), newClassName);
                            content = content.replace(tableNameExp, `.Entity('${snakeCaseTableName}')`);
                            yield LibFs.writeFileSync(newFilePath, content);
                            ShardTableStorage_1.shardTableFileStorage().set(newClassName, newFilePath);
                        }
                        catch (error) {
                            console.log('caught error = ', error);
                            return;
                        }
                    }
                }
            }
            catch (error) {
                console.log('caught error = ', error);
                return;
            }
        });
    }
    /**
     * Create Database cluster by options
     * @param options array of ClusterOptions
     */
    createClusterConnections(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const clusters = this.clusters;
            try {
                for (let cluster of options) {
                    cluster.cluster.forEach(options => {
                        options.entities.forEach(entity => {
                            this.checkShardTable(entity);
                        });
                    });
                    clusters.set(cluster.name, yield typeorm_1.createConnections(cluster.cluster));
                }
            }
            catch (error) {
                throw error;
            }
            return clusters;
        });
    }
    /**
     * return Connection by optional shardkey and databaseName
     * @param shardKey
     * @param databaseName
     */
    getShardConnection(shardKey, databaseName) {
        const clusters = this.clusters;
        if (clusters.size <= 0) {
            throw new Error('there is no connection cluster here');
        }
        if (databaseName && !clusters.has(databaseName)) {
            throw new Error('can not found such DatabaseName');
        }
        const cluster = databaseName ?
            clusters.get(databaseName) : [...clusters.values()][0];
        const index = shardKey ?
            Math.abs(parseInt(crc_1.crc32(shardKey.toString()).toString(), 16)) % cluster.length : 0;
        return cluster[index];
    }
    /**
     * get ShardEntity by className & shardKey
     * @param className
     * @param shardKey
     * @param databaseName
     */
    getShardEntity(className, shardKey, databaseName) {
        const args = ShardTableStorage_1.shardTableMetadataStorage().get(className);
        if (args) {
            const count = args.shardCount;
            const index = Math.abs(parseInt(crc_1.crc32(shardKey.toString()).toString(), 16)) % count;
            const newClassName = `${className}_${index}`;
            return PlatformTools_1.PlatformTools.load(ShardTableStorage_1.shardTableFileStorage().get(newClassName))[newClassName];
        }
        return null;
    }
}
exports.DatabaseFactory = DatabaseFactory;
