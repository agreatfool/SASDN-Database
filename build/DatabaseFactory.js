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
const EntityStorage_1 = require("./typeorm/EntityStorage");
const LibFs = require("mz/fs");
const LibPath = require("path");
const ToolUtils_1 = require("./ToolUtils");
const glob_1 = require("glob");
var HashRing = require('hashring');
class DatabaseFactory {
    constructor() {
        // Find connection by Entity's class name. Map<className, connectionName>
        this.databaseEntitiesMap = new Map();
        this._hashringMap = new Map();
    }
    static get instance() {
        if (this._instance === undefined) {
            this._instance = new DatabaseFactory();
        }
        return this._instance;
    }
    get hashringMap() {
        return this._hashringMap;
    }
    /**
     * Read given path to find ShardTable then copy & rewrite shardTableEntity
     * @param entityPath
     */
    checkShardTable(entityPath, classSet) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof (entityPath) === 'function') {
                return;
            }
            try {
                const files = glob_1.glob.sync(entityPath);
                const storage = EntityStorage_1.default.instance;
                for (const file of files) {
                    const copyExp = /[a-zA-Z0-9]+_[0-9]+.js/;
                    const copyMatch = copyExp.exec(file);
                    if (copyMatch) {
                        try {
                            if (LibFs.statSync(file).isFile()) {
                                LibFs.unlinkSync(file);
                            }
                        }
                        catch (error) {
                            console.log('caught error by unlink copy file = ', error);
                        }
                        continue;
                    }
                    // find fileName
                    const fileBaseName = LibPath.basename(file);
                    const fileName = fileBaseName.substring(0, fileBaseName.length - 3);
                    const rootPath = file.substring(0, file.length - fileBaseName.length);
                    const content = LibFs.readFileSync(file, 'utf-8');
                    const classNameMatch = yield ToolUtils_1.ToolUtils.regExec(content, /class\s\b[A-Za-z0-9]+\b/);
                    const className = classNameMatch.replace('class ', '');
                    classSet.add(className);
                    storage.shardTableFileStorage().set(className, file);
                    // find base path
                    try {
                        const matchText = yield ToolUtils_1.ToolUtils.regExec(content, /\.shardTable\([0-9]+\)/);
                        classSet.delete(className);
                        const numberMatch = yield ToolUtils_1.ToolUtils.regExec(matchText, /[0-9]+/);
                        // find shard count
                        const shardCount = parseInt(numberMatch, 10);
                        // find class name
                        const classHash = new HashRing();
                        for (let i = 0; i < shardCount; i++) {
                            try {
                                const newFileName = `${fileName}_${i}`;
                                const newFilePath = LibPath.join(rootPath, `${newFileName}.js`);
                                LibFs.copyFileSync(file, newFilePath, LibFs.constants.COPYFILE_EXCL);
                                const newClassName = `${className}_${i}`;
                                classHash.add(newClassName);
                                classSet.add(newClassName);
                                const snakeCaseTableName = ToolUtils_1.ToolUtils.snakeCase(newClassName);
                                const tableNameExp = new RegExp(/\.Entity\(\'\S+\'\)/);
                                let newContent = content.replace(new RegExp(className, 'gm'), newClassName);
                                newContent = newContent.replace(tableNameExp, `.Entity('${snakeCaseTableName}')`);
                                LibFs.writeFileSync(newFilePath, newContent);
                                storage.shardTableFileStorage().set(newClassName, newFilePath);
                            }
                            catch (error) {
                                //console.log('caught sharding table error = ', error);
                                continue;
                            }
                        }
                        this.hashringMap.set(className, classHash);
                    }
                    catch (error) {
                        //console.log('caught finding table error = ', error);
                        continue;
                    }
                }
            }
            catch (error) {
                //console.log('caught finding file error = ', error);
                return;
            }
            return this.hashringMap;
        });
    }
    /**
     * Create Database by options
     * @param options array of ClusterOptions
     * @param outputPath which path to create ConnectionMap.json
     */
    createDatabaseConnections(option, outputPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const entitySet = new Set();
                for (const opts of option.optionList) {
                    for (const entity of opts.entities) {
                        yield this.checkShardTable(entity, entitySet);
                    }
                }
                const connections = yield typeorm_1.createConnections(option.optionList);
                const connMap = {};
                if (option.shardingStrategies) {
                    for (const strategy of option.shardingStrategies) {
                        if (!typeorm_1.getConnectionManager().has(strategy.connctionName)) {
                            throw new Error('There is no such ConnectionName in ShardingStrategy');
                        }
                        for (const etyname of strategy.entities) {
                            if (!entitySet.has(etyname)) {
                                throw new Error('There is no such EntityName in ShardingStrategy');
                            }
                            this.databaseEntitiesMap.set(etyname, strategy.connctionName);
                        }
                        connMap[strategy.connctionName] = strategy.entities;
                    }
                }
                else {
                    const entitiesClass = [...entitySet];
                    for (let i = 0; i < entitiesClass.length; i++) {
                        const index = (i + connections.length) % connections.length;
                        const connName = connections[index].name;
                        const className = entitiesClass[i];
                        this.databaseEntitiesMap.set(className, connName);
                        if (connMap[connName] === undefined) {
                            connMap[connName] = [];
                        }
                        connMap[connName].push(className);
                    }
                }
                if (outputPath && LibFs.statSync(outputPath).isDirectory()) {
                    LibFs.writeFileSync(LibPath.join(outputPath, 'ConnectionMap.json'), JSON.stringify(connMap));
                }
            }
            catch (error) {
                throw error;
            }
        });
    }
    /**
     * Return Connection by optional shardkey and databaseName
     */
    getConnection(entity) {
        const connectionName = this.databaseEntitiesMap.get(entity.name);
        return typeorm_1.getConnectionManager().get(connectionName);
    }
    /**
     * Get ShardEntity by className & shardKey
     * @param entity
     * @param shardKey
     */
    getEntity(entity, shardKey) {
        const storage = EntityStorage_1.default.instance;
        let className = typeof (entity) === 'function' ? entity.constructor.name : entity;
        const args = storage.shardTableMetadataStorage().get(className);
        if (args) {
            if (shardKey === undefined) {
                shardKey = '';
            }
            className = this.hashringMap.get(className).get(shardKey);
        }
        return require(storage.shardTableFileStorage().get(className))[className];
    }
}
exports.DatabaseFactory = DatabaseFactory;
