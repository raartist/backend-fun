const express = require('express');
const router = express.Router();

let users = [];
router.get("/",(req,res)=>{
    // res.send([{id:1,name:"john"},{id:2,name:"kartik"}]);
    res.json(users);
})
router.post("/",(req,res)=>{
    users.push(req.body);
    res.json({success:true})
})

module.exports = router;