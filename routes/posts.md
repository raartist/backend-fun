📚 Building a Production-Ready GET /posts Route

This is the process you naturally evolved into over the last few days. I think it's worth documenting because it's a reusable pattern for many endpoints.

Step 1 — Define the API contract

Decide what the endpoint should support.

Example:

GET /posts
GET /posts?userId=5
GET /posts?search=react
GET /posts?page=2&limit=20
GET /posts?sort=oldest

Before writing code, know what inputs your API accepts.

Step 2 — Read query parameters

Extract and normalize inputs.

const { userId, search, sort } = req.query;
const page = Number(req.query.page ?? 1);
const limit = Number(req.query.limit ?? 10);

Convert numeric values immediately instead of carrying strings through the code.

Step 3 — Validate inputs

Validate everything coming from the client.

Examples:

page is a positive integer
limit is between 1 and 100
userId is a positive integer
sort belongs to an allowed whitelist

Return 400 Bad Request for invalid inputs.

Step 4 — Prepare pagination

Calculate:

const offset = (page - 1) \* limit;

Create parameter arrays:

const queryParams = [limit, offset];
const countParams = [];
Step 5 — Start with the base query

Instead of building the whole query at once, start with the common part.

SELECT ...
FROM posts p
JOIN users u ...

Similarly for the count query:

SELECT COUNT(\*)
FROM posts p
Step 6 — Collect filters instead of concatenating SQL

This is probably the biggest improvement you made.

Instead of writing:

if (...)
query += ...

if (...)
query += ...

build arrays:

const conditions = [];
const countConditions = [];

Each filter contributes one condition.

Examples:

conditions.push(...)
countConditions.push(...)
Step 7 — Add parameters safely

Whenever you add a condition:

Push the value into the parameter array.
Use the current parameter index.

Example:

queryParams.push(searchTerm);

conditions.push(
`p.title ILIKE $${queryParams.length}`
);

Never concatenate raw user input into SQL.

Step 8 — Assemble the WHERE clause

Only if filters exist:

WHERE condition1
AND condition2
AND condition3

using

conditions.join(" AND ")

This scales naturally as more filters are added.

Step 9 — Handle sorting safely

Never do:

ORDER BY ${req.query.sort}

Instead:

Use a whitelist.

const sortWhitelist = {
newest: "...",
oldest: "...",
title: "..."
};

Validate invalid values.

Choose a default when the parameter is missing.

Step 10 — Add pagination

Append

ORDER BY ...
LIMIT ...
OFFSET ...

at the end of the query.

Step 11 — Execute both queries

One query returns:

current page of posts

Second query returns:

total number of matching posts

Both queries should use the same filters.

Step 12 — Build pagination metadata

Calculate:

totalPages
hasNextPage
hasPreviousPage

from:

page
limit
totalPosts
Step 13 — Shape the response

Return a structured response instead of a bare array.

Example:

{
"posts": [...],
"pagination": {
"page": 1,
"limit": 10,
"totalPosts": 95,
"totalPages": 10,
"hasNextPage": true,
"hasPreviousPage": false
}
}
🔑 Principles You Learned Along the Way

These are the concepts—not just the code—that are worth remembering:

Validate before querying the database.
Always use parameterized queries for user input.
Build SQL dynamically using conditions, not string concatenation.
Use a whitelist for SQL identifiers like ORDER BY.
Separate data retrieval from metadata (COUNT(\*)).
Pagination metadata should describe the filtered dataset, not the entire table.
Structure API responses so they're easy for the frontend to consume.
Think about scalability—adding a new filter should require minimal changes.

pre-aggregated table joins - to prevent join multiplication issue

SELECT p.id, p.title, p.content, p.user_id, u.name AS username,
COALESCE(l.likes_count, 0) AS likes_count,
COALESCE(c.comments_count, 0) AS comments_count FROM posts p LEFT JOIN users u
ON p.user_id = u.id
LEFT JOIN (SELECT post_id, count(_) as likes_count FROM likes l GROUP BY post_id ) l
on p.id = l.post_id LEFT JOIN (SELECT post_id, count(_) as comments_count FROM comments c
GROUP BY post_id) c
ON p.id = c.post_id
