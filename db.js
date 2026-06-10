const { Pool } = require("pg");

const pool = new Pool({

   user:"postgres",

   password:"9090",

   host:"localhost",

   port:5432,

   database:"backend-learning"

});

module.exports = pool;