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
const FCM = require('fcm-push');
const serverKey = require('../config/serverKey').serverKey;
var fcm = new FCM(serverKey);

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

       console.log(userInfo);
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
       if(!(!req.files||!req.files.length)){
         console.log("images");
         let query3="insert into image (image, postId) values ?";
         let record3 = [];
         for(var key in req.files){
           if(req.files[key]){
            record3.push([req.files[key].location, postId.insertId]);
          }
         }

         console.log("record3",record3);
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
      var location = req.params.location;
      let query1 = '';
      if(location == 25){
        query1 = 'select postId, title, view_num, date, name, profile from post order by postId desc';

      }else{
       query1 = 'select postId, title, view_num, date, name, profile from post where location=? order by postId desc';
      }
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

      console.log('post,,,userId : '+ req.userId);
      let query0 = 'select postId from post where postId=? and userId=?';
      let my = await connection.query(query0, [postId, req.userId]);
      //조회수 +1
      let query1 = 'update post set view_num = view_num + 1 where postId=?';
      await connection.query(query1, postId);

      //특정 게시글 정보 가져오기
      let query2 = 'select content from post where postId=?';
      let post = await connection.query(query2, postId);

      //특정 게시글 이미지 가져오기
      let query3 = 'select image from image where postId=?';
      let images = await connection.query(query3, postId);

      //댓글 정보 가져오기
      let query4 = 'select * from comment where postId=?';
      let comments = await connection.query(query4, postId);

      res.status(200).send({
        "message" : "Succeed in selecting post and comments.",
        "post" : post,
        "images" : images,
        "comments" : comments,
        "my" : my.length
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


      let query3 = 'select deviceToken from user u, post p where u.userId = p.userId and p.postId=?';
      let deviceToken = await connection.query(query3, req.body.postId);
      console.log(deviceToken);
        //알람부르기 & 메세지전송 & 저장
        var message = {
            to: deviceToken[0].deviceToken , // required fill with device token or topics
            notification: {
                title: '서우리',
                body: req.body.userName+'님이 작성하신 게시글에 댓글을 달았습니다.'
            }
        };
        console.log(serverKey);
        fcm.send(message)
          .then(function(response){
              console.log(message);
              console.log("Successfully sent with response: ", response);
          })
          .catch(function(err){
              console.log("Something has gone wrong!");
              console.error(err);
          });
 
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


//ios 댓글 작성
//req -> (userId, content, postId)
router.post('/comment', async(req, res)=>{
  try{
    console.log(req.body.postId);
    if(!(req.body.postId && req.body.userId && req.body.content)){
      res.status(403).send({"message": "please input all of postId, userId, content."});
    } else{
      var connection = await pool.getConnection();
      var userId = req.body.userId;
      let query1 = 'select name, deviceToken from user where userId=?';
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

      let query3 = 'select deviceToken from user u, post p where u.userId = p.userId and p.postId=?';
      let deviceToken = await connection.query(query3, req.body.postId);
      console.log(deviceToken);
        //알람부르기 & 메세지전송 & 저장
        var message = {
            to: deviceToken[0].deviceToken , // required fill with device token or topics
            data: {
              content_available : true
            },
            notification: {
                title: '서우리',
                body: req.body.userName+'님이 작성하신 게시글에 댓글을 달았습니다.'
            }
        };
        console.log(serverKey);
        fcm.send(message)
          .then(function(response){
              console.log(message);
              console.log("Successfully sent with response: ", response);
          })
          .catch(function(err){
              console.log("Something has gone wrong!");
              console.error(err);
          });
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
    pool.releaseConnection(connection);
  }
});

router.put('/', async(req, res)=>{
  try{
     if(!(req.body.postId&&req.body.title&&req.body.content)){
       res.status(403).send({ message: 'please input all of postId, title, content.'});
     } else{
       var connection = await pool.getConnection();

       console.log(1111111);
       //post 테이블에 게시글 데이터 삽입
       let query1='update post set ? where postId=?';
       let record = {
         "title" : req.body.title,
         "content" : req.body.content,
         "date" : moment().format('YY.MM.DD HH:mm'),
       };

       await connection.query(query1, [record, req.body.postId]);
       res.status(200).send({ "message" : "Succeed in updating post." });
     }
  } catch(err){
    console.log(err);
    res.status(500).send({
      "message": "syntax error"
    });
  } finally{
    pool.releaseConnection(connection);
  }
})

router.delete('/:postId', async(req, res)=>{
  try{
    if(!req.params.postId){
      res.status(403).send({"message": "please input postId."});
    } else{
      var connection = await pool.getConnection();
      let query = 'delete from post where postId=?';
      await connection.query(query, req.params.postId);

      res.status(200).send({"message" : "delete post Succeed"});
    }
  } catch(err){
    console.log(err);
    res.status(500).send({
      "message": "syntax error"
    });
  }finally{
    pool.releaseConnection(connection);
  }
});
module.exports = router;
