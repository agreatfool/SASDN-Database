import { DatabaseOptions, DatabaseFactory } from '../src';
import * as LibPath from 'path';

const databaseOptions: DatabaseOptions = {
  name: 'mysql',
  type: 'mysql',
  // custom shardingStrategies
  /*
  shardingStrategies: [
    {
      connctionName: 'test_shard_0',
      entities: [
        'ShardEntity_0',
        'ShardEntity_3',
      ],
    },
    {
      connctionName: 'test_shard_1',
      entities: [
        'ShardEntity_1',
        'ShardEntity_4',
      ],
    },
    {
      connctionName: 'test_shard_2',
      entities: [
        'ShardEntity_2',
      ],
    },
  ],
  */
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
    const EntityModule = DatabaseFactory.instance.getEntity('ShardEntity', shardKey);
    try {
      const result = await EntityModule.findOne({ tableId: shardKey });
      success++;
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
    const EntityModule = DatabaseFactory.instance.getEntity('ShardEntity', shardKey);
    const entity = new EntityModule(shardKey);
    entity.tableId = shardKey;
    entity.tableDesc = shardKey.toString();
    try {
      const result = await entity.save();
      success++;
    } catch (error) {
      fail++;
      console.log('on save caught error = ', error);
    }
    console.log('total write success = ', success, '| fail = ', fail);
  }
}

async function main(): Promise<any> {
  try {
    await DatabaseFactory.instance.initialize(databaseOptions, __dirname);
    console.log('create connections finish! please waiting for write');
    await write();
    await read();
  } catch (error) {
    console.log('caught error at main error = ', error);
  }
}

main().then(_ => _);
