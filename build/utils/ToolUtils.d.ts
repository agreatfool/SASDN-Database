/// <reference types="node" />
import * as LibFs from 'mz/fs';
export declare namespace ToolUtils {
    function snakeCase(str: string): string;
    function regExec(str: string, regExp: RegExp): Promise<string>;
    function deleteAll(path: string): void;
    function getClassName(content: string): Promise<string>;
    function getShardCount(content: string): Promise<number>;
    function isCopyFile(filePath: string): Promise<boolean>;
    function fsCopy(src: LibFs.PathLike, dest: LibFs.PathLike): Promise<any>;
    function copyNewFile(fileName: string, filePath: string, rootPath: string, index: number, needCopyFile?: boolean): Promise<{
        [key: string]: string;
    }>;
    function rewriteFile(className: string, content: string, newFilePath: string, index: number): Promise<string>;
}
