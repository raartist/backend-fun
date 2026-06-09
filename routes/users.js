const express = require('express');
const router = express.Router();
const authMiddleware = require('../auth/auth');

const db = require('../db');

router.get("/:id",async(req,res)=>{
    const id = req.params.id;
    try{
        const user = await db.query("select * from users where id = $1",[id]);
        if(user.rows.length===0){
            return res.status(404).json({error:"User not found"});
        }
        res.json(user.rows[0]);
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Internal Server Error"});
    }
});


router.get("/",async(req,res)=>{
    const {search} = req.query;
    try{
        let users;
        if(search){
            users = await db.query("select * from users where name ILIKE $1",[`%${search}%`]);
        }else{
            users = await db.query("select * from users");
        }
        // console.log(users);
        res.json(users.rows);
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Internal Server Error"});
    }
})

router.post("/", async(req,res)=>{

   const {name,email}=req.body;

   if(!name || !email){
      return res.status(400).json({error:"Name and email are required"});
   }

   const result = await db.query(

      `
      INSERT INTO users(name,email)

      VALUES($1,$2)

      RETURNING *
      `,

      [name,email]

   );

   res.json(result.rows[0]);

});

router.patch("/:id",async(req,res)=>{

   const id = req.params.id;
    const {name,email}=req.body;

    if(!name && !email){
        return res.status(400).json({error:"Name or email is required"});
    }

    try{
        const result = await db.query(
            `
            UPDATE users
            SET name = coalesce($1, name), email = coalesce($2, email)
            WHERE id = $3
            RETURNING *
            `,
            [name,email,id]
        );
        if(result.rows.length===0){
            return res.status(404).json({error:"User not found"});
        }
        res.json(result.rows[0]);
    }catch(err){
        console.error(err);
        res.status(500).json({error:"Internal Server Error"});
    }
});

router.get(
   "/profile",
   authMiddleware,
   (req,res)=>{
      res.json({
         name:"Aaron"
      });
});

module.exports = router;