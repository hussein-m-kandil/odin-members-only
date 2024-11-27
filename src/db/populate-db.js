const { basename } = require('path');
const { argv, exit } = require('process');
const { Client } = require('pg');

const SQL = `
  -- ** START ** NODE CONNECT PG SIMPLE
  -- https://github.com/voxpelli/node-connect-pg-simple/blob/main/table.sql

  CREATE TABLE IF NOT EXISTS users_sessions (
    sid VARCHAR(255) PRIMARY KEY NOT DEFERRABLE INITIALLY IMMEDIATE NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_sessions_expire ON users_sessions (expire);

  -- ** END ** NODE CONNECT PG SIMPLE

  CREATE TABLE IF NOT EXISTS users (
    user_id      INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    fullname     VARCHAR(100) NOT NULL,
    username     VARCHAR(50) UNIQUE NOT NULL,
    is_admin     BOOLEAN DEFAULT FALSE,
    password     CHAR(60) NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

  CREATE TABLE IF NOT EXISTS posts (
    post_id      INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id      INTEGER REFERENCES users (user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    post_title   VARCHAR(100) NOT NULL,
    post_body    TEXT NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

function getUrlToDB() {
  if (require.main === module) {
    if (argv.length === 3) {
      return argv[2].trim();
    }
    const runtime = basename(argv[0]);
    const filename = basename(argv[1]);
    console.log(
      `Usage: ${runtime} ${filename} <postgresql://user:pass@host:port/db>`
    );
    exit(1);
  }

  if (!process.env.PG_CONN_STR) {
    throw Error(
      'Cannot determine the DB connection string to proceed DB population!'
    );
  }

  return process.env.PG_CONN_STR;
}

async function main() {
  const dbUrl = getUrlToDB();
  try {
    console.log('Trying to populate the database...');
    const dbClient = new Client({ connectionString: dbUrl });
    console.log('Connecting...');
    await dbClient.connect();
    console.log('Seeding...');
    await dbClient.query(SQL);
    console.log('Disconnecting...');
    await dbClient.end();
    console.log('Done.');
  } catch (error) {
    if (require.main !== module) {
      throw error;
    }
    console.log(error);
    exit(2);
  }
}

if (require.main === module) main();
else module.exports = main;
