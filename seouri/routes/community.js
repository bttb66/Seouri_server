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


//게시글 작성
//req -> (userId, title, content, images(최대5개 배열로), location)
router.post('/', upload.array('images', 5), async(req, res)=>{
  try{
     if(!(req.body.title&&req.body.content&&req.body.userId&&req.body.location)){
       res.status(403).send({ message: 'please input all of title, content, userId.'});
     } else{
       var connection = await pool.getConnection();

       //post 테이블에 게시글 데이터 삽입
       let query1='insert into post set ?';
       let record = {
         "userId" : req.body.userId,
         "title" : req.body.title,
         "content" : req.body.content,
         "location" : req.body.location,
         "date" : moment().format('YY.MM.DD HH:mm')
       };

       var postId = await connection.query(query1, record);
       if(!req.files){
         let query2="insert into image (image, postId) values ?";
         let record2 = [];
         for(var key in req.files){
           if(req.files[key]){
            record2.push([req.files[key].location, postId.insertId]);
          }
         }

         console.log(record2);
         await connection.query(query2, [record2]);
       }

       res.status(200).send({ "message" : "Succeed in inserting post." });
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

// 게시글 조회
// req(param) -> (location(서울시, 구별)...인코딩...)
router.get('/list/:location', async(req, res) =>{
  try{
    if(!req.params.location){
      res.status(403).send({"message": "please input location."});
    } else{
      var connection = await pool.getConnection();
      let query1 = 'select * from post where location=? order by postId desc';
      let posts = await connection.query(query1, req.params.location);
      res.status(200).send({
        "message" : "Succeed in selecting posts" ,
        "result" : posts
      });
    }
  } catch (err){
    console.log(err);
    res.status(500).send({
      "message": "syntax error"
    });
  } finally{
    pool.releaseConnection(connection);
  }
});

//특정 게시글 조회
//req(param) -> (postId)
router.get('/:postId', async(req, res)=>{
  try{
    if(!req.params.postId){
      res.status(403).send({ "message" : "please input postId." });
    } else{
      var connection = await pool.getConnection();
      let postId = req.params.postId;

      //조회수 +1
      let query1 = 'update post set view_num = view_num + 1 where postId=?';
      await connection.query(query1, postId);

      //특정 게시글 정보 가져오기
      let query2 = 'select * from post where postId=?';
      let post = await connection.query(query2, postId);

      //특정 게시글 이미지 가져오기
      let query3 = 'select image from image where postId=?';
      let images = await connection.query(query3, postId);
      if(images.length){
        post[0].images = [];
        for(var key in images) post[0].images.push(images[key].image);
      }
      //댓글 정보 가져오기
      let query4 = 'select * from comment where postId=?';
      let comments = await connection.query(query4, postId);

      res.status(200).send({
        "message" : "Succeed in selecting post and comments.",
        "post" : post[0],
        "comments" : comments
      });
    }
  }catch(err){
    console.log(err);
    res.status(500).send({
      "message": "syntax error"
    });
  } finally{
    pool.releaseConnection(connection);
  }
});

//댓글 작성
//req -> (userId, content, postId)
router.post('/comment', async(req, res)=>{
  try{
    console.log(req.body.postId);
    if(!(req.body.postId && req.body.userId && req.body.content)){
      res.status(403).send({"message": "please input all of postId, userId, content."});
    } else{
      var connection = await pool.getConnection();

      let query1 = 'insert into comment set ?';
      let record = {
        "postId" : req.body.postId,
        "userId" : req.body.userId,
        "content" : req.body.content,
        "date" : moment().format('YY.MM.DD HH:mm')
      };
      await connection.query(query1, record);
      res.status(200).send({"message": "Succeed in inserting comment."});
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
