const { Pool } = require("pg");
const USERNAME = process.env.USER;
const PASSWORD = process.env.PASSWORD;
const PORT = process.env.PORT;
const DB_NAME = process.env.DB_NAME;

const pool = new Pool({
  user: USERNAME,

  password: PASSWORD,

  host: "localhost",

  port: PORT,

  database: DB_NAME,
});

module.exports = pool;
