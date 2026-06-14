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

router.patch("/:id", authMiddleware, async (req, res) => {
  const postId = Number(req.params.id);
  const { title, content } = req.body;

  if (Number.isNaN(postId)) {
    return res.status(400).json({
      error: "Invalid post ID",
    });
  }

  if (title === undefined && content === undefined) {
    return res.status(400).json({
      error: "At least one of title or content must be provided",
    });
  }
  if (
    (typeof title === "string" && title.trim() === "") ||
    (typeof content === "string" && content.trim() === "")
  ) {
    return res.status(400).json({
      error: "Empty values are not allowed for title or content",
    });
  }
  try {
    const postResult = await db.query(
      `
        SELECT id FROM posts WHERE id = $1
        `,
      [postId],
    );

    if (!postResult.rows[0]) {
      return res.status(404).json({
        error: "Post not found",
      });
    } else if (postResult.rows[0]?.user_id !== req.user.id) {
      return res.status(403).json({
        error: "You are not authorized to update this post",
      });
    }
    const result = await db.query(
      `
      UPDATE posts
      SET title = coalesce($1, title), content = coalesce($2, content)
      WHERE id = $3
        RETURNING *
      `,
      [title, content, postId],
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  const postId = Number(req.params.id);
  if (Number.isNaN(postId)) {
    return res.status(400).json({
      error: "Invalid post ID",
    });
  }
  try {
    const postResult = await db.query(
      `
            SELECT id FROM posts WHERE id = $1
            `,
      [postId],
    );
    if (!postResult.rows[0]) {
      return res.status(404).json({
        error: "Post not found",
      });
    } else if (postResult.rows[0]?.user_id !== req.user.id) {
      return res.status(403).json({
        error: "You are not authorized to delete this post",
      });
    }

    const deletedPost = await db.query(`DELETE FROM posts WHERE id = $1 RETURNING *`, [postId]);
    res.json({
      message: "Post deleted successfully",
      post: deletedPost.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/comments", authMiddleware, async (req, res) => {
  const postId = Number(req.params.id);
  const { content } = req.body;

  if (Number.isNaN(postId)) {
    return res.status(400).json({
      error: "Invalid post ID",
    });
  }
  if (!content?.trim()) {
    return res.status(400).json({
      error: "Content is required",
    });
  }
  try {
    const postResult = await db.query(
      `
      SELECT id FROM posts WHERE id = $1
      `,
      [postId],
    );
    if (!postResult.rows[0]) {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    const result = await db.query(
      `
      INSERT INTO comments(content, post_id, user_id)
      VALUES($1, $2, $3)
        RETURNING *
      `,
      [content, postId, req.user.id],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/:id/comments", authMiddleware, async (req, res) => {
  const postId = Number(req.params.id);

  if (Number.isNaN(postId)) {
    return res.status(400).json({
      error: "Invalid post ID",
    });
  }
  try {
    const postResult = await db.query(
      `
      SELECT id FROM posts WHERE id = $1
      `,
      [postId],
    );
    if (!postResult.rows[0]) {
      return res.status(404).json({
        error: "Post not found",
      });
    }
    const result = await db.query(
      `
      SELECT c.*, u.name as username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
      `,
      [postId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
