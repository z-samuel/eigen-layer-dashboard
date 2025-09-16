import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTables1700000000001 implements MigrationInterface {
  name = 'CreateTables1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create pod_deployed_events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pod_deployed_events" (
        "id" SERIAL PRIMARY KEY,
        "eigen_pod" VARCHAR NOT NULL,
        "pod_owner" VARCHAR NOT NULL,
        "block_number" INTEGER NOT NULL,
        "transaction_hash" VARCHAR NOT NULL,
        "log_index" INTEGER NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("transaction_hash", "log_index")
      )
    `);

    // Create staked_eth_events table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staked_eth_events" (
        "id" SERIAL PRIMARY KEY,
        "pubkey" VARCHAR NOT NULL,
        "withdrawal_credentials" VARCHAR NOT NULL,
        "amount" VARCHAR NOT NULL,
        "signature" VARCHAR NOT NULL,
        "deposit_index" VARCHAR NOT NULL,
        "block_number" INTEGER NOT NULL,
        "block_timestamp" INTEGER NOT NULL,
        "transaction_hash" VARCHAR NOT NULL,
        "log_index" INTEGER NOT NULL,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("transaction_hash", "log_index")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pod_deployed_events_block_number" ON "pod_deployed_events" ("block_number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_pod_deployed_events_pod_owner" ON "pod_deployed_events" ("pod_owner")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staked_eth_events_block_number" ON "staked_eth_events" ("block_number")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_staked_eth_events_pubkey" ON "staked_eth_events" ("pubkey")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "staked_eth_events"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pod_deployed_events"`);
  }
}
