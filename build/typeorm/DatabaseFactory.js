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
class DatabaseFactory {
    constructor() {
        // Find connection by Entity's class name. Map<className, connectionName>
        this._entityToConnection = {};
        this._shardHashMap = {};
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
                    //console.log('caught finding className error = ', error);
                    continue;
                }
                classSet.add(className);
                EntityStorage_1.EntityStorage.instance.shardTableFileStorage[className] = filePath;
                let shardCount = 0;
                try {
                    // find sharding count
                    shardCount = yield ToolUtils_1.ToolUtils.getShardCount(content);
                }
                catch (error) {
                    //console.log('caught finding table error = ', error);
                    continue;
                }
                classSet.delete(className);
                const classHash = new HashRing();
                for (let i = 0; i < shardCount; i++) {
                    try {
                        // copy file
                        const { newFileName, newFilePath } = yield ToolUtils_1.ToolUtils.copyNewFile(fileName, filePath, rootPath, i);
                        // rewrite file
                        const newClassName = yield ToolUtils_1.ToolUtils.rewriteFile(className, content, newFilePath, i);
                        classSet.add(newClassName);
                        classHash.add(newClassName);
                        EntityStorage_1.EntityStorage.instance.shardTableFileStorage[newClassName] = newFilePath;
                    }
                    catch (error) {
                        //console.log('caught sharding table error = ', error);
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
     * @param {string} outputPath which path to create ConnectionMap.json
     */
    initialize(option, outputPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const entitySet = new Set();
            for (const opts of option.optionList) {
                for (const entity of opts.entities) {
                    yield this._checkShardTable(entity, entitySet);
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
                        this.entityToConnection[etyname] = strategy.connctionName;
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
                    this.entityToConnection[className] = connName;
                    if (connMap[connName] === undefined) {
                        connMap[connName] = [];
                    }
                    connMap[connName].push(className);
                }
            }
            // if given outputPath then will write ConnectionMap to show [ connection => Entity ]
            if (outputPath && LibFs.statSync(outputPath).isDirectory()) {
                LibFs.writeFileSync(LibPath.join(outputPath, 'ConnectionMap.json'), JSON.stringify(connMap));
            }
        });
    }
    /**
     * Return Connection by Entity
     * @param {BaseOrmEntity} entity
     */
    getConnection(entity) {
        const connectionName = this.entityToConnection[entity.name];
        return typeorm_1.getConnectionManager().get(connectionName);
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
            shardKey = shardKey === undefined ? '' : shardKey;
            className = this.shardHashMap[className].get(shardKey);
        }
        const filePath = EntityStorage_1.EntityStorage.instance.shardTableFileStorage[className];
        if (filePath === undefined) {
            throw new Error(`Can not found a Entity with name: ${className}`);
        }
        return require(filePath)[className];
    }
}
exports.DatabaseFactory = DatabaseFactory;
