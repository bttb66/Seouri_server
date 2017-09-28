const express = require('express');
const aws = require('aws-sdk');
const router = express.Router();
const pool = require('../config/db_pool.js');
aws.config.loadFromPath('./config/aws_config.json');
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

//카테고리별 마을기업 조회
// req(param) -> (category(놀거리/ 먹거리/ 구경거리/ 체험거리))
router.get('/:villageEnterpriseId', async(req, res)=>{
  try{
    if(!req.params.villageEnterpriseId){
      res.status(403).send({message: 'please input villageEnterpriseId.'});
    }
    else{
      var connection = await pool.getConnection();
      let query1 = 'select category from villageEnterprise where villageEnterpriseId=?;';
      let posts = await connection.query(query1, req.params.villageEnterpriseId);
      res.status(200).send({
        "message":"Succeed in selecting a posts1" ,
        "result" : posts
      });
    }
  }catch(err){
    res.status(500).send({"message" : "server err " [err]});
  } finally{
    pool.releaseConnection(connection);
  }
});

//특정 마을기업 조회 & 검색시 한번에 연결되는 팝업
//req(param) -> (villageEnterpriseId)
router.get('/detail/:villageEnterpriseId', async(req, res)=>{
  try{
    if(!req.params.villageEnterpriseId){
      res.status(403).send({message: 'please input villageEnterpriseId.'});
    } else{
      var connection = await pool.getConnection();
      let query1 = 'select * from villageEnterprise where villageEnterpriseId=?;';
      let posts = await connection.query(query1, req.params.villageEnterpriseId);
      res.status(200).send({
        "message":"Succeed in selecting a posts2" ,
        "result" : posts
      });
    }
  }catch(err){
      res.status(500).send({"message" : "server err"});
  } finally{
    pool.releaseConnection(connection);
  }
});

module.exports = router;
