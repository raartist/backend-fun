const express = require('express');
const router = express.Router();
const authMiddleware = require('../auth/auth');

const db = require('../db');



router.get("/",async(req,res)=>{
    try{
        const users = await db.query("select * from users");
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

// router.post("/",(req,res)=>{
//     users.push(req.body);
//     res.json({success:true})
// })

router.get(
   "/profile",
   authMiddleware,
   (req,res)=>{
      res.json({
         name:"Aaron"
      });
});

module.exports = router;