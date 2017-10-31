const express = require('express');
const router = express.Router();
const aws = require('aws-sdk');
const pool = require('../config/db_pool');
//aws.config.loadFromPath('./config/aws_config.json');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = new aws.S3();
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'seouri',
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now() + '.' + file.originalname.split('.').pop());
    }
  })
});
const jwt = require('jsonwebtoken');


//구인정보등록하기
router.post('/', async(req, res)=>{
  try{
     if(!(req.body.name&&req.body.joburl&&req.body.address)){
       res.status(403).send({ message: 'please input all of name, joburl, address.'});
     } else{
       var connection = await pool.getConnection();
       //question 테이블에 게시글 데이터 삽입
       let query2='insert into jobInformation set ?';
       let record = {
         "name" : req.body.name,
         "joburl" : req.body.joburl,
         "address" : req.body.address,
         "pay" : req.body.pay,
         "time" : req.body.time
       };

       var job = await connection.query(query2, record);

       res.status(200).send({ "message" : "Succeed in inserting job." });
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
module.exports = router;
