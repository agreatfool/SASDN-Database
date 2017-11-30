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
const crc_1 = require("crc");
class DatabaseFactory {
    constructor() {
        // -------------------------------------------------------------------------
        // Protected Properties
        // -------------------------------------------------------------------------
        this.clusters = new Map();
    }
    // -------------------------------------------------------------------------
    // Public Static Methods
    // -------------------------------------------------------------------------
    static get instance() {
        if (this._instance === undefined) {
            this._instance = new DatabaseFactory();
        }
        return this._instance;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * create Database cluster by options
     * @param options array of ClusterOptions
     */
    createClusterConnections(options) {
        return __awaiter(this, void 0, void 0, function* () {
            const clusters = this.clusters;
            try {
                for (let cluster of options) {
                    let dbCluster = {
                        name: cluster.name,
                        type: cluster.type,
                        connections: yield typeorm_1.createConnections(cluster.cluster)
                    };
                    clusters.set(dbCluster.name, dbCluster.connections);
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
            Math.abs(parseInt(crc_1.crc32(String(shardKey)), 16)) % cluster.length : 0;
        return cluster[index];
    }
}
exports.DatabaseFactory = DatabaseFactory;
