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

router.post('/', async function (req, res) {
    try {
      if(!(req.body.userLat && req.body.userLng)){
        res.status(403).send({ message: 'please input userLat, userLng.'});
      } else{
          var connection = await pool.getConnection();
         //포스터
         let poster = 'select image from image where posterId=1;';
         let poster1= await connection.query(poster);
         //이주의 마을기업
          let query = 'select villageEnterpriseId,name,photo from villageEnterprise where villageEnterpriseId=1;';
          let query2 = 'select villageEnterpriseId,name,photo from villageEnterprise where villageEnterpriseId=2;';
          let villageweek1= await connection.query(query);
          let villageweek2= await connection.query(query2);
          let viilageweek=[
            villageweek1[0],
            villageweek2[0]
          ];
          //알림마당
          let query3 = 'select * from villageInformation;';
          let villageinformation= await connection.query(query3);
          //구인정보
          let query4 = 'select * from jobInformation;';
          let jobinformation= await connection.query(query4);

          let query5 = ''+
        'SELECT *, '+
         '(6371*acos(cos(radians(?))*cos(radians(lat))*cos(radians(lng)'+
         '-radians(?))+sin(radians(?))*sin(radians(lat))))'+
         'AS distance'+
        ' FROM villageEnterprise'+
        ' ORDER BY distance'+
        ' Limit 1;';
        var userLat = req.body.userLat;
        var userLng = req.body.userLng;
        console.log('userLat' + userLat);
        console.log('userLng' + userLng);
        var distanceRec = await connection.query(query5, [userLat, userLng, userLat]);
        //lat : 위도, lng : 경도
        res.status(200).send({
          "message" : "Succeed in home",
          "poster" : poster1,
          "weekvillageEnterprise" : viilageweek,
          "villageinformation" : villageinformation,
          "jobinformation" : jobinformation,
          "distanceRec" : distanceRec[0]
        });
      }
   }
    catch (err) {
      res.status(500).send({ "message": "selecting village error"});
  }
  finally {
      pool.releaseConnection(connection);
  }
});

module.exports = router;
