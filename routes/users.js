const express = require('express');
const router = express.Router();
const authMiddleware = require('../auth/auth');

let users = [];
router.get("/",(req,res)=>{
    // res.send([{id:1,name:"john"},{id:2,name:"kartik"}]);
    res.json(users);
})
router.post("/",(req,res)=>{
    users.push(req.body);
    res.json({success:true})
})

router.get(
   "/profile",
   authMiddleware,
   (req,res)=>{
      res.json({
         name:"Aaron"
      });
});

module.exports = router;