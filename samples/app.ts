import { DatabaseOptions, DatabaseFactory } from '../src';
import * as LibPath from 'path';

const databaseOptions: DatabaseOptions = {
  name: 'mysql',
  type: 'mysql',
  optionList: [
    {
      name: 'test_shard_0',
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'test_shard_0',
      synchronize: false,
      entities: [LibPath.join(__dirname, 'entities/*.js')],
    },
    {
      name: 'test_shard_1',
      type: 'mysql',
      host: '127.0.0.1',
      port: 3307,
      username: 'root',
      password: 'root',
      database: 'test_shard_1',
      synchronize: false,
      entities: [LibPath.join(__dirname, 'entities/*.js')],
    },
    {
      name: 'test_shard_2',
      type: 'mysql',
      host: '127.0.0.1',
      port: 3308,
      username: 'root',
      password: 'root',
      database: 'test_shard_2',
      synchronize: false,
      entities: [LibPath.join(__dirname, 'entities/*.js')],
    },
  ],
};

async function read() {
  let success: number = 0;
  let fail: number = 0;
  for (let i = 0; i < 10000; i++) {
    const shardKey = 1000000 + i;
    const EntityModule = DatabaseFactory.instance.getEntity('GameGuid', shardKey);
    try {
      let result = await EntityModule.findOne({ tableId: shardKey });
      success++;
      console.log(`read[${success}] success result = ${result}`);
    } catch (error) {
      fail++;
      console.log('on save caught error = ', error);
    }
  }
  console.log('total read success = ', success, '| fail = ', fail);
}

async function write() {
  let success = 0;
  let fail = 0;
  for (let i = 0; i < 10000; i++) {
    const shardKey = 1000000 + i;
    const EntityModule = DatabaseFactory.instance.getEntity('GameGuid', shardKey);
    const entity = new EntityModule(shardKey);
    entity.tableId = shardKey;
    entity.tableDesc = shardKey.toString();
    try {
      const result = await entity.save();
      success++;
      console.log(`write[${success}] success result = ${result}`);
    } catch (error) {
      fail++;
      console.log('on save caught error = ', error);
    }
    console.log('total write success = ', success, '| fail = ', fail);
  }
}

async function main() {
  try {
    await DatabaseFactory.instance.initialize(databaseOptions, __dirname);
    console.log('create connections finish! please waiting for write');
    await write();
    await read();
  } catch (error) {
    
  }
}

main().then(_ => _);
