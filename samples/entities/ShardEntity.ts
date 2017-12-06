
import { Entity, Column, PrimaryColumn } from 'typeorm';
import { BaseOrmEntity, shardTable } from '../../src';

@Entity('shard_table')
@shardTable(5)
export class ShardEntity extends BaseOrmEntity {
  @PrimaryColumn({ type: 'bigint', name: 'guid' })
  tableid: number;

  @Column({ type: 'varchar', name: 'table_desc', length: 255})
  tableDesc: string;
}
