const express = require("express");
const app = express();
app.use(express.json());
const dotenv = require("dotenv");
dotenv.config();

// This pattern is heavily used for:

// Authentication middleware
// Authorization
// Logging
// Validation
// Rate limiting

const usersRoutes = require("./routes/users");
app.use("/users", usersRoutes);

//Home
app.get("/", (req, res) => {
  res.send("Home");
});
//About
app.get("/about", (req, res) => {
  res.send("hello backend on about page");
});

//stateless server example
let count = 0;
app.get("/visits", (req, res) => {
  count++;
  res.send({ count });
});

app.listen(3000, () => {
  console.log("running on 3000");
});
