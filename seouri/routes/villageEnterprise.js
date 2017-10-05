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


//리스트별 마을기업 조회
// req(param) ->  location(구정보)
router.get('/list/:location', async(req, res)=>{
  try{
      var location = req.params.location;
    if(!location){
      res.status(403).send({message: 'please input location.'});
    }
    else{
      var connection = await pool.getConnection();
      let query1 = 'select villageEnterpriseId, name, photo, category from villageEnterprise where location=?;';
      let list = await connection.query(query1, location);

        res.status(200).send({
          "message":"Succeed in selecting location" ,
          "list" : list
        });
    }
  }catch(err){
    res.status(500).send({
      "message": "syntax error"
    });
  } finally{
    pool.releaseConnection(connection);
  }
});

//특정 마을기업 조회
//req(param) -> (villageEnterpriseId)
router.get('/detail/:villageEnterpriseId', async(req, res)=>{
  try{
    var id = req.params.villageEnterpriseId;
    if(!id){
      res.status(403).send({message: 'please input villageEnterpriseId.'});
    } else{
      var connection = await pool.getConnection();
      let query1 = 'select * from villageEnterprise where villageEnterpriseId=?;';
      let ve = await connection.query(query1, id);

      if(ve.length){
        //특정 게시글 이미지 가져오기
        let query2 = 'select image from image where villageEnterpriseId=?;';
        let images = await connection.query(query2, id);
        if(images.length){ //게시글에 이미지 존재할 경우
          ve[0].images = [];
          for(var key in images) ve[0].images.push(images[key].image);
        }
        res.status(200).send({
          "message":"Succeed in selecting Specific VillageEnterprise" ,
          "Specific VillageEnterprise" : ve[0]
        });
      }else{
          res.status(401).send({"message":"Not exist Specific VillageEnterprise"});
      }
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

//검색시 한번에 연결되는 팝업
//req(param) -> (name)
router.get('/:name', async(req, res)=>{
  try{
    var name = req.params.name;
    if(!name){
      res.status(403).send({message: 'please input name.'});
    } else{
        var connection = await pool.getConnection();
        let query1 = 'select * from villageEnterprise where name=?;';
        let popup = await connection.query(query1, name);

        if(popup.length){
          //특정 게시글 이미지 가져오기
          let query2 = 'select i.image from image i, villageEnterprise v where i.villageEnterpriseId=v.villageEnterpriseId and v.name=?;';
          let images = await connection.query(query2, name);
          if(images.length){ //게시글에 이미지 존재할 경우
            popup[0].images = [];
            for(var key in images) popup[0].images.push(images[key].image);
          }
          res.status(200).send({
            "message":"Succeed in selecting popup" ,
            "popup" : popup[0]
          });
        }else{
            res.status(401).send({"message":"Not exist popup"});
        }
      }
  }catch(err){
    res.status(500).send({
      "message": "syntax error"
    });
  } finally{
    pool.releaseConnection(connection);
  }
});

module.exports = router;
