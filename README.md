# SASDN-Database

SASDN-Database是基于[Typeorm](https://github.com/typeorm/typeorm)的封装，内部实现了分库分表的功能，对于开发者来说，只需要遵循一些规范即可像原来一样通过操作对象的方式来操作数据库。

分表首先需要用户指定**ShardKey**，然后根据[hashring](https://github.com/3rd-Eden/node-hashring)进行一致性HASH计算得出该数据落在那一张分表上。

使用者可以采用配置的方式定义每一张表位于哪一个库上，若使用者缺省，则默认采用取余的方式将所有的表平均分配到每一个库上。

而分库则使用反向查找的方式，根据表来定位落在哪一个库上，从而返回对应的链接。

## 1. 规范定义

- 所有`Entity`类均需要继承`BaseOrmEntity`
- 分表需要使用`ShardTable`装饰器，并给定分表数量
- 将所有`Entity`类统一放在一个entities文件夹中，并且在命名中不要使用`_`
- 统一通过`getEntity`方法获得获得具体`Entity`类
- 使用`DatabaseOptions`对数据库链接进行声明，并调用`initialize`进行初始化

## 2. 如何使用

首先需要定义数据库文件的sql文件(若使用NOSQL则无需定义)，然后根据定义好的sql文件写相应的`Entity`，一个简单的`EntityClass`如下：

```
import { Entity, Column, PrimaryColumn } from 'typeorm';
import { BaseOrmEntity, ShardTable } from 'sasdn-database';

@Entity('shard_table') // 定义表名
@ShardTable(5)		   // 定义分表数量
export class ShardEntity extends BaseOrmEntity {  // 继承BaseOrmEntity
  @PrimaryColumn({ type: 'bigint', name: 'guid' })
  tableid: number;

  @Column({ type: 'varchar', name: 'table_desc', length: 255})
  tableDesc: string;
}

```

然后我们可以在通过sql文件创建完表之后编写数据库链接配置：

```
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
      // 默认采用*.js进行泛指
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
```

然后我们就需要调用初始化函数：

```
// 第二个参数将在制定目录生成一份数据库链接对应具体Entity的Json文件，方便
// 后续进行维护和查询
DatabaseFactory.instance.initialize(databaseOptions, __dirname);
```

然后我们就可以编写对应的数据库操作：

```
\\ Write
const EntityModule = DatabaseFactory.instance.getEntity('ShardEntity', shardKey);
const entity = new EntityModule(shardKey);
entity.tableId = shardKey;
entity.tableDesc = shardKey.toString();
try {
  const result = await entity.save();
  console.log(`write[${success}] success result = ${result}`);
} catch (error) {
  console.log('on save caught error = ', error);
}

\\ Read
const EntityModule = DatabaseFactory.instance.getEntity('ShardEntity', shardKey);
try {
  let result = await EntityModule.findOne({ tableId: shardKey });
  console.log(`read[${success}] success result = ${result}`);
} catch (error) {
  console.log('on save caught error = ', error);
}
```

具体可以参考`samples`中的例子。