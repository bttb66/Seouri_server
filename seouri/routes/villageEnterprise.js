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

//키워드 검색
//req(param) -> (name)
router.post('/search', async(req, res)=>{
    try{
      var name = req.body.name;
      if(!name){
        res.status(403).send({message: 'please input name.'});
      } else{
          var connection = await pool.getConnection();
          let query1 = 'select name, villageEnterpriseId, photo, category from villageEnterprise where name like"%' + name + '%";';
          let KeywordList = await connection.query(query1, name);

          res.status(200).send({
            "message":"Succeed in selecting keywordList" ,
            "KeywordList" : KeywordList
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


//전체마을기업조회
router.get('/total', async(req, res)=>{
  try{
      var connection = await pool.getConnection();
      let query1 = 'select villageEnterpriseId, name, location from villageEnterprise;';
      let TotalVeList = await connection.query(query1);

        res.status(200).send({
          "message":"Succeed in selecting total villageEnterprise" ,
          "TotalVelist" : TotalVeList
        });
  }catch(err){
    res.status(500).send({
      "message": "syntax error"
    });
  } finally{
    pool.releaseConnection(connection);
  }
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
      if(location == 25){
        let query1 = 'select villageEnterpriseId, name, photo, category from villageEnterprise;';
        let TotalList = await connection.query(query1, location);

          res.status(200).send({
            "message":"Succeed in selecting total location" ,
            "list" : TotalList
          });
      }
      else{
        let query2 = 'select villageEnterpriseId, name, photo, category from villageEnterprise where location=?;';
        let list = await connection.query(query2, location);

          res.status(200).send({
            "message":"Succeed in selecting location" ,
            "list" : list
          });
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

      var title = [], url = [];

      if(ve[0].article){
        if(ve[0].article.length){
          ve[0].article = ve[0].article.split('\n');

          for(var i in ve[0].article){
            if(ve[0].article[i].indexOf("http://") != -1){
              url.push(ve[0].article[i]);
            }
            else{
                title.push(ve[0].article[i]);
            }
          }

          ve[0].article = [];
          for(var j = 0; j < title.length; j++){
            var subArticle = {
              "title": title[j],
              "url": url[j]
            };
            ve[0].article.push(subArticle);
          }
        }
      }


      if(ve.length){
        //특정 게시글 이미지 가져오기
        let query3 = 'select image from image where villageEnterpriseId=?;';
        let images = await connection.query(query3, id);
        if(images.length){ //게시글에 이미지 존재할 경우
          ve[0].images = images;
        }
        res.status(200).send({
          "message":"Succeed in selecting Specific VillageEnterprise" ,
          "specificVe" : ve[0]
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
          let query2 = 'select image from image where villageEnterpriseId=?;';
          let images = await connection.query(query2, popup[0].villageEnterpriseId);
          if(images.length){ //게시글에 이미지 존재할 경우
            popup[0].images = images;
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
