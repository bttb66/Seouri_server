const express = require('express');
const router = express.Router();
const aws = require('aws-sdk');
const pool = require('../config/db_pool');
aws.config.loadFromPath('./config/aws_config.json');
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

router.get('/', async function (req, res) {
    try {
        var connection = await pool.getConnection();
       //포스터
       let poster = 'select image from image where imageId=6;';
       let poster1= await connection.query(poster);
       //이주의 마을기업
        let query = 'select vill.villageEnterpriseId,name,image from villageEnterprise vill,image where image.villageEnterpriseId=1 and vill.villageEnterpriseId=1;';
       let query2 = 'select vill.villageEnterpriseId,name,image from villageEnterprise vill,image where image.villageEnterpriseId=2 and vill.villageEnterpriseId=2;';
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

      res.status(200).send({
        "message" : "Succeed in home",
        "poster" : poster1[0],
        "weekvillageEnterprise" : viilageweek,
        "villageinformation" : villageinformation,
        "jobinformation" : jobinformation
      });
 }
  catch (err) {
    res.status(500).send({ message: 'selecting village error' + err });
}
finally {
    pool.releaseConnection(connection);
}
});

module.exports = router;
