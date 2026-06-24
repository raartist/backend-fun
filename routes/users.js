const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const JWT_SECRET = process.env.JWT_SECRET;

const db = require("../db");

router.get("/profile", authMiddleware, async (req, res) => {
  res.json({
    user: req.user,
  });
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const user = await db.query("select * from users where id = $1", [id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/", async (req, res) => {
  const { search } = req.query;
  try {
    let users;
    if (search) {
      users = await db.query("select * from users where name ILIKE $1", [`%${search}%`]);
    } else {
      users = await db.query("select * from users");
    }
    // console.log(users);
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/:id", async (req, res) => {
  const id = req.params.id;
  const { name, email } = req.body;

  if (!name && !email) {
    return res.status(400).json({ error: "Name or email is required" });
  }

  try {
    const result = await db.query(
      `
            UPDATE users
            SET name = coalesce($1, name), email = coalesce($2, email)
            WHERE id = $3
            RETURNING *
            `,
      [name, email, id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  if (
    (!name && name.trim() === "") ||
    (!email && email.trim() === "") ||
    (!password && password.trim() === "")
  ) {
    res.status(400).json({
      error: "Name, Email or password can not be empty!",
    });
  }

  const result = await db.query(
    `
      INSERT INTO users(name,email,password)
      VALUES($1,$2,$3)
      RETURNING id,name,email
      `,
    [name, email, hashedPassword],
  );

  res.status(201).json(result.rows[0]);
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query(
    `
      SELECT *
      FROM users
      WHERE email = $1
      `,
    [email],
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({
      error: "Invalid credentials",
    });
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(401).json({
      error: "Invalid credentials",
    });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "24h" });

  res.json({
    message: "Login successful",
    token,
  });
});

router.get("/:id/posts", authMiddleware, async (req, res) => {
  const userId = Number(req.params.id);

  if (Number.isNaN(userId)) {
    return res.status(400).json({
      error: "Invalid user ID",
    });
  }
  try {
    const result = await db.query(
      `
            SELECT p.id, p.title, p.content
            FROM posts p
            WHERE p.user_id = $1
            `,
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
