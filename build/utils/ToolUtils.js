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
const LibFs = require("mz/fs");
const LibPath = require("path");
const fs_copy_file_1 = require("fs-copy-file");
const debug = require('debug')('SASDN-Database');
var ToolUtils;
(function (ToolUtils) {
    function snakeCase(str) {
        return str.replace(/(?:^|\.?)([A-Z])/g, (x, y) => '_' + y.toLowerCase()).replace(/^_/, '');
    }
    ToolUtils.snakeCase = snakeCase;
    function regExec(str, regExp) {
        const matchResult = regExp.exec(str);
        if (matchResult) {
            return Promise.resolve(matchResult[0]);
        }
        throw new Error('There is no match text in this RegExp');
    }
    ToolUtils.regExec = regExec;
    function deleteAll(path) {
        let files = [];
        if (LibFs.existsSync(path)) {
            files = LibFs.readdirSync(path);
            for (const file of files) {
                const curPath = path + '/' + file;
                if (LibFs.statSync(curPath).isDirectory()) {
                    deleteAll(curPath);
                }
                else {
                    LibFs.unlinkSync(curPath);
                }
            }
            LibFs.rmdirSync(path);
        }
    }
    ToolUtils.deleteAll = deleteAll;
    function getClassName(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const classNameMatch = yield regExec(content, /class\s\b[A-Za-z0-9]+\b/);
            const className = classNameMatch.replace('class ', '');
            return className;
        });
    }
    ToolUtils.getClassName = getClassName;
    function getShardCount(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const matchText = yield regExec(content, /\.ShardTable\([0-9]+\)/);
            const numberMatch = yield regExec(matchText, /[0-9]+/);
            const shardCount = parseInt(numberMatch, 10);
            return shardCount;
        });
    }
    ToolUtils.getShardCount = getShardCount;
    function isCopyFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const copyExp = /[a-zA-Z0-9]+_[0-9]+.js/;
            const copyMatch = copyExp.exec(filePath);
            if (copyMatch) {
                try {
                    const stat = yield LibFs.stat(filePath);
                    if (stat.isFile()) {
                        yield LibFs.unlink(filePath);
                    }
                }
                catch (error) {
                    debug(`caught error by unlink copy file = ${filePath}`);
                }
                return true;
            }
            return false;
        });
    }
    ToolUtils.isCopyFile = isCopyFile;
    function fsCopy(src, dest) {
        return new Promise((resolve, reject) => {
            fs_copy_file_1.fs_copy_file(src, dest, (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }
    ToolUtils.fsCopy = fsCopy;
    function copyNewFile(fileName, filePath, rootPath, index) {
        return __awaiter(this, void 0, void 0, function* () {
            const newFileName = `${fileName}_${index}`;
            const newFilePath = LibPath.join(rootPath, `${newFileName}.js`);
            yield fsCopy(filePath, newFilePath);
            return { newFileName, newFilePath };
        });
    }
    ToolUtils.copyNewFile = copyNewFile;
    function rewriteFile(className, content, newFilePath, index) {
        return __awaiter(this, void 0, void 0, function* () {
            const newClassName = `${className}_${index}`;
            const snakeCaseTableName = snakeCase(newClassName);
            const tableNameExp = new RegExp(/\.Entity\(\'\S+\'\)/);
            let newContent = content.replace(new RegExp(className, 'gm'), newClassName);
            newContent = newContent.replace(tableNameExp, `.Entity('${snakeCaseTableName}')`);
            yield LibFs.writeFile(newFilePath, newContent);
            return newClassName;
        });
    }
    ToolUtils.rewriteFile = rewriteFile;
})(ToolUtils = exports.ToolUtils || (exports.ToolUtils = {}));
