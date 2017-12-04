import * as LibPath from 'path';

export class PlatformTools {
  static load(name: string): any {
    // if name is not absolute or relative, then try to load package from the node_modules of the directory we are currenly in
    try {
      return require(name);
    } catch (err) {
      if (!LibPath.isAbsolute(name) && name.substr(0, 2) !== './' && name.substr(0, 3) !== '../') {
        return require(LibPath.resolve(process.cwd() + '/node_modules/' + name));
      }
      throw err;
    }
  }
}