import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("data", (table) => {
    table.increments("id");
    table.string("meterID");
    table.date("date");
    table.float("value");
    table.string("unit");
    table.string("type");
    table.string("spotID");
  });
}

export async function down(knex: Knex): Promise<void> {}
