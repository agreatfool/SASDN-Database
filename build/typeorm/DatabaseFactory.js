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
const EntityStorage_1 = require("./EntityStorage");
const LibFs = require("mz/fs");
const LibPath = require("path");
const ToolUtils_1 = require("../utils/ToolUtils");
const glob_1 = require("glob");
const HashRing = require('hashring');
const debug = require('debug')('SASDN:Database');
class DatabaseFactory {
    constructor() {
        // Find connection by Entity's class name. Map<className, connectionName>
        this._entityToConnection = {};
        this._shardHashMap = {};
        this._classMap = {};
    }
    static get instance() {
        if (this._instance === undefined) {
            this._instance = new DatabaseFactory();
        }
        return this._instance;
    }
    get shardHashMap() {
        return this._shardHashMap;
    }
    get entityToConnection() {
        return this._entityToConnection;
    }
    updateZipkin(zipkin, ctx) {
        this._zipkin = zipkin;
        this._context = ctx;
    }
    /**
     * Read given path to find ShardTable then copy & rewrite shardTableEntity
     * @param {string | Function} entityPath
     * @param {Set<string>} classSet
     */
    _checkShardTable(entityPath, classSet) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof (entityPath) === 'function') {
                return;
            }
            const filePaths = glob_1.glob.sync(entityPath);
            for (const filePath of filePaths) {
                if (yield ToolUtils_1.ToolUtils.isCopyFile(filePath)) {
                    continue;
                }
                // find fileName
                const pathParse = LibPath.parse(filePath);
                const fileName = pathParse.name;
                // find rootPath to copy sharding table file
                const rootPath = pathParse.dir;
                const content = yield LibFs.readFile(filePath, 'utf-8');
                let className;
                try {
                    // find className
                    className = yield ToolUtils_1.ToolUtils.getClassName(content);
                }
                catch (error) {
                    debug(`caught finding className error = ${error}`);
                    continue;
                }
                classSet.add(className);
                EntityStorage_1.EntityStorage.instance.shardTableFileStorage[className] = filePath;
                let shardCount = 0;
                try {
                    // find sharding count
                    shardCount = yield ToolUtils_1.ToolUtils.getShardCount(content, className);
                }
                catch (error) {
                    debug(`caught finding table error = ${error}`);
                    continue;
                }
                classSet.delete(className);
                const classHash = new HashRing();
                for (let i = 0; i < shardCount; i++) {
                    try {
                        let newClassName = '';
                        // copy file
                        const { newFileName, newFilePath } = yield ToolUtils_1.ToolUtils.copyNewFile(fileName, filePath, rootPath, i);
                        // rewrite file
                        newClassName = yield ToolUtils_1.ToolUtils.rewriteFile(className, content, newFilePath, i);
                        classSet.add(newClassName);
                        classHash.add(newClassName);
                        EntityStorage_1.EntityStorage.instance.shardTableFileStorage[newClassName] = newFilePath;
                    }
                    catch (error) {
                        debug(`caught sharding table error = ${error}`);
                        continue;
                    }
                }
                this.shardHashMap[className] = classHash;
            }
            return;
        });
    }
    /**
     * Create Database by option
     * @param {DatabaseOptions} option DatabaseOptions
     * @param {ZipkinBase} zipkin optonal ZipkinProxy import by SASDN-Zipkin
     * @param {object} ctx optional koa or grpc context
     * @param {string} outputPath which path to create ConnectionMap.json
     */
    initialize(option, outputPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const entitySet = new Set();
            for (const connectionOption of option.connectionList) {
                for (const entity of connectionOption.entities) {
                    const filePaths = glob_1.glob.sync(entity);
                    filePaths.forEach(filePath => {
                        const _ = require(filePath);
                        if (option.needCheckShard === false) {
                            const baseName = LibPath.basename(filePath, '.js');
                            if (baseName.indexOf('_') >= 0) {
                                EntityStorage_1.EntityStorage.instance.shardTableFileStorage[baseName] = filePath;
                            }
                            else {
                                const args = EntityStorage_1.EntityStorage.instance.shardTableMetadataStorage[baseName];
                                if (args) {
                                    const { shardCount } = args;
                                    const classHash = new HashRing();
                                    Array(shardCount).forEach((v, i) => {
                                        classHash.add(`${baseName}_${i}`);
                                    });
                                    this.shardHashMap[baseName] = classHash;
                                }
                            }
                        }
                    });
                    if (option.needCheckShard) {
                        yield this._checkShardTable(entity, entitySet);
                    }
                }
            }
            debug('Check ShardTable finish');
            this._connections = yield typeorm_1.createConnections(option.connectionList);
            debug('Create connection finish');
            const connMap = {};
            if (option.shardingStrategies) {
                for (const strategy of option.shardingStrategies) {
                    if (!typeorm_1.getConnectionManager().has(strategy.connctionName)) {
                        throw new Error('There is no such ConnectionName in ShardingStrategy');
                    }
                    for (const entityName of strategy.entities) {
                        if (!entitySet.has(entityName)) {
                            throw new Error('There is no such EntityName in ShardingStrategy');
                        }
                        this.entityToConnection[entityName] = strategy.connctionName;
                    }
                    connMap[strategy.connctionName] = strategy.entities;
                }
                debug('Read custom ShardingStrategy finish');
            }
            else {
                const entitiesClass = [...entitySet];
                for (let i = 0; i < entitiesClass.length; i++) {
                    const index = (i + this._connections.length) % this._connections.length;
                    const connName = this._connections[index].name;
                    const className = entitiesClass[i];
                    this.entityToConnection[className] = connName;
                    if (connMap[connName] === undefined) {
                        connMap[connName] = [];
                    }
                    connMap[connName].push(className);
                }
                debug('Use default ShardingStrategy finish');
            }
            // if given outputPath then will write ConnectionMap to show [ connection => Entity ]
            if (outputPath && LibFs.statSync(outputPath).isDirectory()) {
                LibFs.writeFileSync(LibPath.join(outputPath, 'ConnectionMap.json'), JSON.stringify(connMap, null, 2));
            }
            else {
                debug(`Currect ConnectionMap = ${JSON.stringify(connMap, null, 2)}`);
            }
            return this._connections;
        });
    }
    /**
     * Return Connection by Entity
     * @param {BaseOrmEntity} entity
     */
    getConnection(entity) {
        const connectionName = this.entityToConnection[entity.name];
        let conn = typeorm_1.getConnectionManager().get(connectionName);
        if (this._zipkin !== undefined && this._context !== undefined) {
            return this._zipkin.createClient(conn, this._context);
        }
        return conn;
    }
    /**
     * Get Entity by given className & shardKey
     * @param {string | Function} entity
     * @param {string | number} shardKey
     */
    getEntity(entity, shardKey) {
        let className = typeof (entity) === 'function' ? entity.constructor.name : entity;
        const args = EntityStorage_1.EntityStorage.instance.shardTableMetadataStorage[className];
        if (args) {
            className = shardKey ? this.shardHashMap[className].get(shardKey) : `${className}_0`;
        }
        const filePath = EntityStorage_1.EntityStorage.instance.shardTableFileStorage[className];
        if (filePath === undefined) {
            throw new Error(`Can not found a Entity with name: ${className}`);
        }
        if (!this._classMap[className]) {
            this._classMap[className] = require(filePath)[className];
            if (!this._classMap[className]) {
                throw new Error(`Can not require this Entity with name: ${className}`);
            }
        }
        return this._classMap[className];
    }
    /**
     * Close all connections
     * @returns {Promise<void>}
     */
    closeAllConnections() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._connections) {
                return;
            }
            for (const connection of this._connections) {
                yield connection.close();
            }
        });
    }
}
exports.DatabaseFactory = DatabaseFactory;
