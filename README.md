# SASDN-Database

## 1. 简介

SASDN-Database是基于[Typeorm](https://github.com/typeorm/typeorm)的封装，内部实现了分库分表的功能，对于开发者来说，只需要遵循一些规范即可像原来一样通过操作对象的方式来操作数据库。

## 2. 功能

### 2.1 分表

分表首先需要用户指定**ShardKey**，然后通过装饰器`ShardTable`定义所需分表的数量，插件会自动进行分表操作，对用户来说是无感知的。一张需要进行分表的`Entity`类似下面的代码：

```
import { Entity, Column, PrimaryColumn } from 'typeorm';
import { BaseOrmEntity, ShardTable } from 'sasdn-database';

@Entity('shard_table') // 定义表名
@ShardTable(5)		   // 定义分表数量
export class ShardEntity extends BaseOrmEntity {  // 继承BaseOrmEntity
  @PrimaryColumn({ type: 'bigint', name: 'table_id' })
  tableId: number;

  @Column({ type: 'varchar', name: 'table_desc', length: 255})
  tableDesc: string;
}
```

### 2.2 分库

分库将根据用户给定的`DatabaseOptions`中的`shardingStrategies`字段读取用户希望那张表落于那个库上，若用户不指定则默认使用取余的方式将所有表散列到所有库上。自定义配置如下：

```
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
```

### 2.3 内部原理

分表是插件通过读取**ShardKey**后根据[hashring](https://github.com/3rd-Eden/node-hashring)进行一致性HASH计算得出该数据落在那一张分表上。

而分库则使用反向查找的方式，根据表来定位落在哪一个库上，从而返回对应的链接。

## 3. 规范定义

- 所有`Entity`类均需要继承`BaseOrmEntity`
- 分表需要使用`ShardTable`装饰器，并给定分表数量
- 将所有`Entity`类统一放在一个entities文件夹中，并且在命名中不要使用`_`
- 统一通过`getEntity`方法获得获得具体`Entity`类
- 使用`DatabaseOptions`对数据库链接进行声明，并调用`initialize`进行初始化

## 4. 具体使用

### 4.1 定义数据库文件

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

### 4.2 定义DatabaseOptions

然后我们可以在通过sql文件创建完表之后编写数据库链接配置：

```
const databaseOptions: DatabaseOptions = {
  name: 'mysql',
  type: 'mysql',
  // 需要先在数据库上生成对应的表，不然会报错
  // 第一次使用可不指定，使用默认进行表分配
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
  connectionList: [
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

### 4.3 初始化链接

然后我们就需要调用初始化函数：

```
// 第二个参数将在制定目录生成一份数据库链接对应具体Entity的Json文件，方便
// 后续进行维护和查询，若不指定可从console中查看具体输出
DatabaseFactory.instance.initialize(databaseOptions, __dirname);
```

### 4.4 编写业务代码

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

具体可以参考`samples`中的例子。例子中使用`sqlite3`进行一个简单的数据库操作，在目录下直接执行`npm start`即可。