import * as LibFs from 'mz/fs';

export namespace ToolUtils {
  export function snakeCase(str: string): string {
    return str.replace(/(?:^|\.?)([A-Z])/g, (x, y) => '_' + y.toLowerCase()).replace(/^_/, '');
  }

  export function regExec(str: string, regExp: RegExp): Promise<string> {
    const matchResult = regExp.exec(str);
    if (matchResult) {
      return Promise.resolve(matchResult[0]);
    }
    throw new Error('There is no match text in this RegExp');
  }

  export function deleteAll(path: string): void {
    let files:string[] = [];
    if (LibFs.existsSync(path)) {
      files = LibFs.readdirSync(path);
      for (const file of files) {
        const curPath:string = path + "/" + file;
        if (LibFs.statSync(curPath).isDirectory()) { // recurse  
          deleteAll(curPath);
        } else { // delete file  
          LibFs.unlinkSync(curPath);
        }
      }
      LibFs.rmdirSync(path);
    }
  }
}
