const express = require("express");
const router = express.Router();
const authMiddleware = require("../auth/auth");
const db = require("../db");

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
