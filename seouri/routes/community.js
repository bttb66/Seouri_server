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


//게시글 작성
//req -> (userId, title, content, images(최대5개 배열로), location)
router.post('/', upload.array('images', 5), async(req, res)=>{
  try{
     if(!(req.body.title&&req.body.content&&req.body.userId&&req.body.location)){
       res.status(403).send({ message: 'please input all of title, content, userId.'});
     } else{
       var connection = await pool.getConnection();
       var userId = req.body.userId;
       let query = 'select name, profile from user where userId=?'
       var userInfo = await connection.query(query, userId);

       console.log(1111111);
       //post 테이블에 게시글 데이터 삽입
       let query2='insert into post set ?';
       let record = {
         "userId" : userId,
         "title" : req.body.title,
         "content" : req.body.content,
         "location" : req.body.location,
         "date" : moment().format('YY.MM.DD HH:mm'),
         "name" : userInfo[0].name,
         "profile" : userInfo[0].profile
       };

       var postId = await connection.query(query2, record);
       if(req.files.length){
         console.log("images");
         let query3="insert into image (image, postId) values ?";
         let record3 = [];
         for(var key in req.files){
           if(req.files[key]){
            record3.push([req.files[key].location, postId.insertId]);
          }
         }

         console.log(record3);
         await connection.query(query3, [record3]);
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
        "posts" : posts
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

      // //특정 게시글 정보 가져오기
      // let query2 = 'select * from post where postId=?';
      // let post = await connection.query(query2, postId);

      //특정 게시글 이미지 가져오기
      let query2 = 'select image from image where postId=?';
      let images = await connection.query(query2, postId);

      //댓글 정보 가져오기
      let query3 = 'select * from comment where postId=?';
      let comments = await connection.query(query3, postId);

      res.status(200).send({
        "message" : "Succeed in selecting post and comments.",
        "images" : images,
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
      var userId = req.body.userId;
      let query1 = 'select name from user where userId=?';
      var name = await connection.query(query1, userId);

      let query2 = 'insert into comment set ?';
      let record2 = {
        "postId" : req.body.postId,
        "userId" : req.body.userId,
        "content" : req.body.content,
        "date" : moment().format('YY.MM.DD HH:mm'),
        "name" : name[0].name
      };
      await connection.query(query2, record2);
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

//게시판 검색
router.post('/search', async(req, res)=>{
  try{
    if(!req.body.key){
      res.status(403).send({"message": "please input key."});
    } else{
      var key = req.body.key;
      var connection = await pool.getConnection();
      let query = "select * from post where title like '%"+key+"%' or content like '%"+key+"%'";
      console.log(query);
      var result = await connection.query(query);
      res.status(200).send({
        "message" : "Succeed in search",
        "searchRet" : result
      });
    }
  } catch(err){
    console.log(err);
    res.status(500).send({
      "message": "syntax error"
    });
  }finally{
    pool.releaseConnection();
  }
});

module.exports = router;
