const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const db = require("../db");

router.post("/", authMiddleware, async (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({
      error: "Title and content are required",
    });
  }
  try {
    const result = await db.query(
      `
      INSERT INTO posts(title,content,user_id)
      VALUES($1,$2,$3)
        RETURNING *
      `,
      [title, content, req.user.id],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.query.userId;

  if (userId && Number.isNaN(Number(userId))) {
    return res.status(400).json({
      error: "Invalid user ID",
    });
  }
  try {
    let query = `
      SELECT p.id, p.title, p.content, p.user_id, u.name as username
        FROM posts p
        JOIN users u ON p.user_id = u.id
    `;
    const params = [];

    if (userId) {
      query += " WHERE p.user_id = $1";
      params.push(userId);
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/all-posts-with-username", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT p.title, p.content, u.name as username
      FROM posts p
      JOIN users u ON p.user_id = u.id
    `,
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
