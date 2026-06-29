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
  const { userId } = req.query;
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  if (!Number.isInteger(page) || page < 1) {
    return res.status(400).json({
      message: "Page must be a positive integer",
    });
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      message: "Limit must be between 1 and 100",
    });
  }

  if (userId && Number.isNaN(Number(userId))) {
    return res.status(400).json({
      error: "Invalid user ID",
    });
  }
  const offset = (page - 1) * limit;
  const params = [limit, offset];
  const countParams = [];

  const tableFrom = " FROM posts p ";
  const whereClause = ` WHERE p.user_id = $`;

  try {
    let query = `
      SELECT p.id, p.title, p.content, p.user_id, u.name as username
        ${tableFrom}
        JOIN users u ON p.user_id = u.id
    `;

    let resultsCountQuery = `SELECT COUNT(*) as posts_count ${tableFrom}`;

    if (userId) {
      params.push(userId);
      countParams.push(userId);

      query += `${whereClause}${params.length}`;
      resultsCountQuery += `${whereClause}1`;
    }

    query += ` ORDER BY p.id DESC LIMIT $1 OFFSET $2`;

    const result = await db.query(query, params);
    const countResult = await db.query(resultsCountQuery, countParams);
    const totalPosts = Number(countResult.rows[0].posts_count);
    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;
    res.json({
      posts: result.rows,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
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

//patch comment
router.patch("/comments/:id", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const commentId = Number(req.params.id);
  const { content } = req.body;
  if (Number.isNaN(commentId)) {
    return res.status(400).json({
      error: "Invalid comment ID",
    });
  }

  if (content === undefined || typeof content !== "string" || content.trim() === "") {
    return res.status(400).json({
      error: "Content must be a non-empty string",
    });
  }

  try {
    const commentResult = await db.query(`SELECT id, user_id FROM comments WHERE id = $1`, [
      commentId,
    ]);
    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({
        error: "Comment not found",
      });
    }
    if (comment.user_id !== userId) {
      return res.status(403).json({
        error: "You are not authorized to update this comment",
      });
    }

    const updatedComment = await db.query(
      `
      UPDATE comments
      SET content = $1
      WHERE id = $2
      RETURNING *
      `,
      [content, commentId],
    );
    res.json({
      message: "Comment updated successfully",
      comment: updatedComment.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//delete comment
router.delete("/comments/:id", authMiddleware, async (req, res) => {
  const commentId = Number(req.params.id);
  const userId = req.user.id;
  if (Number.isNaN(commentId)) {
    return res.status(400).json({
      error: "Invalid comment ID",
    });
  }
  try {
    const commentResult = await db.query(
      `
      SELECT id, user_id FROM comments WHERE id = $1
      `,
      [commentId],
    );
    const comment = commentResult.rows[0];
    if (!comment) {
      return res.status(404).json({
        error: "Comment not found",
      });
    }
    if (comment.user_id !== userId) {
      return res.status(403).json({
        error: "You are not authorized to delete this comment",
      });
    }
    const deletedComment = await db.query(`DELETE FROM comments WHERE id = $1 RETURNING *`, [
      commentId,
    ]);
    res.json({
      message: "Comment deleted successfully",
      comment: deletedComment.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//Likes routes
router.post("/:id/like", authMiddleware, async (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.user.id;
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

    const likeCheck = await db.query(
      `
      SELECT id FROM likes WHERE post_id = $1 AND user_id = $2
      `,
      [postId, userId],
    );

    if (likeCheck.rows[0]) {
      return res.status(409).json({
        error: "You have already liked this post",
      });
    }
    const likeInsert = await db.query(
      `
      INSERT INTO likes (post_id, user_id) VALUES ($1, $2) RETURNING *
      `,
      [postId, userId],
    );
    res.status(201).json({
      message: "Post liked successfully",
      like: likeInsert.rows[0],
    });
  } catch (err) {
    //postgres unique error code
    if (err.code === "23505") {
      return res.status(409).json({
        error: "You have already liked this post",
      });
    }
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id/like", authMiddleware, async (req, res) => {
  const postId = Number(req.params.id);
  const userId = req.user.id;
  if (Number.isNaN(postId)) {
    return res.status(400).json({
      error: "Invalid post ID",
    });
  }
  try {
    const likeResult = await db.query(
      `
      SELECT id FROM likes WHERE post_id = $1 AND user_id = $2
      `,
      [postId, userId],
    );
    if (!likeResult.rows[0]) {
      return res.status(404).json({
        error: "Like not found",
      });
    }
    const deletedLike = await db.query(
      `DELETE FROM likes WHERE post_id = $1 AND user_id = $2 RETURNING *`,
      [postId, userId],
    );
    res.json({
      message: "Like removed successfully",
      like: deletedLike.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//get likes count for a post
router.get("/allLikes", authMiddleware, async (req, res) => {
  try {
    const likesResults = await db.query(
      `
      SELECT post_id, COUNT(*) as likes_count FROM likes 
      GROUP BY post_id ORDER BY likes_count DESC
      `,
    );
    res.json({ likes: likesResults.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/getAllpostsWithLikesCount", authMiddleware, async (req, res) => {
  try {
    const queryResult = await db.query(
      `SELECT p.id, p.title, p.content, COUNT(l.id) AS likes_count
       FROM posts p LEFT JOIN likes l 
      ON l.post_id = p.id
      GROUP BY p.id, p.title, p.content
      ORDER BY likes_count DESC
      `,
    );

    if (queryResult.rows.length === 0) {
      res.status(404).send({
        message: "Posts not found!",
      });
    }
    res.status(200).send({
      count: queryResult.rowCount,
      posts: queryResult.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/popular", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.title, COUNT(l.id) as likes_count
       FROM posts p LEFT JOIN likes l ON p.id = l.post_id 
       GROUP BY p.id , p.title
       ORDER BY likes_count DESC`,
    );

    res.status(200).json({
      posts: result.rows,
      count: result.rowCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
