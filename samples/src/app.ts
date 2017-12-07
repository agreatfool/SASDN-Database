import { DatabaseOptions, DatabaseFactory } from 'sasdn-database';
import * as LibPath from 'path';
import { ShardEntity } from './entities/ShardEntity';

const databaseOptions: DatabaseOptions = {
  name: 'SQLite',
  type: 'sqlite',
  connectionList: [
    {
      name: 'test_shard_0',
      type: 'sqlite',
      database: 'db/test_shard_0.db',
      synchronize: true,
      entities: [LibPath.join(__dirname, 'entities/*.js')],
    },
    {
      name: 'test_shard_1',
      type: 'sqlite',
      database: 'db/test_shard_1.db',
      synchronize: true,
      entities: [LibPath.join(__dirname, 'entities/*.js')],
    },
    {
      name: 'test_shard_2',
      type: 'sqlite',
      database: 'db/test_shard_2.db',
      synchronize: true,
      entities: [LibPath.join(__dirname, 'entities/*.js')],
    },
  ],
};

async function read() {
  let success: number = 0;
  let fail: number = 0;
  for (let i = 0; i < 100; i++) {
    const shardKey = 1000000 + i;
    const EntityModule = DatabaseFactory.instance.getEntity(ShardEntity.name, shardKey);
    try {
      const result = await EntityModule.findOne({ tableId: shardKey });
      console.log('read result = ', result);
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
  for (let i = 0; i < 100; i++) {
    const shardKey = 1000000 + i;
    const EntityModule = DatabaseFactory.instance.getEntity(ShardEntity.name, shardKey);
    const entity = new EntityModule(shardKey);
    entity.tableId = shardKey;
    entity.tableDesc = shardKey.toString();
    try {
      const result = await entity.save();
      console.log('write result = ', result);
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
    await DatabaseFactory.instance.initialize(databaseOptions);
    console.log('create connections finish! please waiting for write');
    await write();
    await read();
  } catch (error) {
    console.log('caught error at main error = ', error);
  }
}

main().then(_ => _);
