const express = require('express');
const aws = require('aws-sdk');
const router = express.Router();
const pool = require('../config/db_pool.js');
//aws.config.loadFromPath('./config/aws_config.json');
const s3 = new aws.S3();
const moment = require('moment');
const multer = require('multer');
const multerS3 = require('multer-s3');
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'seouri',
    acl: 'public-read', //이미지 읽기만 허용
    key: function(req, file, cb){
      cb(null, Date.now() + '.' + file.originalname.split('.').pop());
    }
  })
});


//문의하기
router.post('/', async(req, res)=>{
    try{
       if(!(req.body.title&&req.body.content&&req.body.userId)){
         res.status(403).send({ message: 'please input all of title, content, userId.'});
       } else{
         var connection = await pool.getConnection();
         var userId = req.body.userId;
         let query = 'select name, profile from user where userId=?'
         var userInfo = await connection.query(query, userId);
  
         //question 테이블에 게시글 데이터 삽입
         let query2='insert into question set ?';
         let record = {
           "userId" : userId,
           "title" : req.body.title,
           "content" : req.body.content,
           "date" : moment().format('YY.MM.DD HH:mm'),
           "name" : userInfo[0].name,
           "profile" : userInfo[0].profile
         };
  
         var questionId = await connection.query(query2, record);
 
         res.status(200).send({ "message" : "Succeed in inserting question." });
       }
  
    } catch(err){
      console.log(err);
      res.status(500).send({
        "message": "syntax error"
      });
    } finally{
      pool.releaseConnection(connection);
    }
  });

//내가 문의한글 조회
// req(param) -> (userId)
router.get('/:userId', async(req, res) =>{
  try{
    if(!req.params.userId){
      res.status(403).send({message: 'please input email.'});
    } else{
      var connection = await pool.getConnection();
      console.log(req.params.userId);
      let query1 = 'select * from question where userId=? order by queId desc';
      let myquestion = await connection.query(query1, req.params.userId);
      res.status(200).send({
        "message" : "Succeed in selecting myquestion" ,
        "myquestion" : myquestion
      });
    }
  } catch (err){
    console.log(err);
    res.status(500).send({
      "message": "syntax error : " [err]
    });
  } finally{
    pool.releaseConnection(connection);
  }
});



module.exports = router;
