import type { Knex } from "knex";

// Update with your config settings.

const development: Knex.Config = {
  client: "better-sqlite3",
  connection: {
    filename: "./dev.sqlite3",
  },

  useNullAsDefault: true,
};

export default { development };
