"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const LibFs = require("mz/fs");
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
                const curPath = path + "/" + file;
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
})(ToolUtils = exports.ToolUtils || (exports.ToolUtils = {}));
