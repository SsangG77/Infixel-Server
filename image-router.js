//라이브러리
const path = require("path");
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const express = require("express");
let router = express.Router();
require("dotenv").config();

//다른 파일
const { pool, folder_name } = require("./index");

//=================================================================

let randomImgCount = 0;
router.get("/randomimage", (req, res) => {
  randomImgCount++;

  let query = `
  SELECT 
  infixel_db.images.*, 
  infixel_db.users.profile_image, 
  infixel_db.users.user_id AS user_at, 
  COUNT(infixel_db.pics.image_id) AS pic
      FROM infixel_db.images
      JOIN infixel_db.users ON infixel_db.images.user_id = infixel_db.users.id
      LEFT JOIN infixel_db.pics ON infixel_db.images.id = infixel_db.pics.image_id
      GROUP BY infixel_db.images.id
      ORDER BY RAND()
      LIMIT 1;`;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release(); // 연결 반환
      if (queryErr) {
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }

      let jsonData = {
        id: results[0].id,
        created_at: results[0].created_at == null ? "" : results[0].created_at,
        user_id: results[0].user_id == null ? "" : results[0].user_id,
        image_link: process.env.URL + "/image/resjpg?filename=" + results[0].image_name,
        description: results[0].description == null ? "" : results[0].description,
        user_at: results[0].user_at,
        profile_image: process.env.URL + "/image/resjpg?filename=" + results[0].profile_image,
        pic: results[0].pic,
      };
      res.json(jsonData);
    });
  });
});

//==========================================================================

//요청객체에 있는 이미지 파일 이름을 응답하는 엔드포인트
router.get("/resjpg", (req, res) => {
  const fileName = req.query.filename;

  const filePath = path.join(__dirname, folder_name, `${fileName}`);
  res.sendFile(filePath);
});

//==========================================================================

//랜덤으로 이미지 파일을 응답
router.get("/randomjpg", (req, res) => {
  const directoryPath = path.join(__dirname, folder_name);

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error('디렉토리를 읽는 중 오류 발생:', err);
      return res.status(500).send('서버 오류');
    }

    if (files.length === 0) {
      return res.status(404).send('디렉토리에 파일이 없습니다.');
    }

    // 랜덤으로 파일 선택
    const randomIndex = Math.floor(Math.random() * files.length);
    const randomFile = files[randomIndex];

    const filePath = path.join(__dirname, folder_name, randomFile);
    res.sendFile(filePath)

    //const mimeType = mime.getType(filePath)

    // sharp(filePath)
    // .resize(800, 600)
    // .toBuffer()
    // .then(data => {
    //   //res.set('Content-Type', mimeType);
    //   res.send(data)
    // })
    // .catch(err => {
    //   console.error('이미지를 처리하는 중 오류 발생:', err);
    //   res.status(500).send('서버 오류');
    // });

    

  });
})


//=============================================================================
//이미지 아이디로 조회된 이미지 응답
router.post("/getimagefromid", (req, res) => {
  const imageId = req.body.image_id


  let query = `
 SELECT infixel_db.images.*, 
  infixel_db.users.profile_image, 
  infixel_db.users.user_id AS user_at, 
  COUNT(infixel_db.pics.image_id) AS pic
FROM infixel_db.images
JOIN infixel_db.users ON infixel_db.images.user_id = infixel_db.users.id
LEFT JOIN infixel_db.pics ON infixel_db.images.id = infixel_db.pics.image_id
WHERE infixel_db.images.id = '${imageId}'
GROUP BY infixel_db.images.id, infixel_db.users.profile_image, infixel_db.users.user_id;
      `
  
  //`select * from infixel_db.images where id = '${imageId}'`

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release(); // 연결 반환
      if (queryErr) {
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }

      let jsonData = {
        id: results[0].id,
        created_at: results[0].created_at == null ? "" : results[0].created_at,
        user_id: results[0].user_id == null ? "" : results[0].user_id,
        image_link: process.env.URL + "/image/resjpg?filename=" + results[0].image_name,
        description: results[0].description == null ? "" : results[0].description,
        user_at: results[0].user_at,
        profile_image: process.env.URL + "/image/resjpg?filename=" + results[0].profile_image,
        pic: results[0].pic,
      };
      console.log("이미지 아이디로 조회")
      console.log(jsonData)
      res.json(jsonData);
    });

  });

})
//=============================================================================


// 업로드 폴더가 없으면 생성
const uploadDir = 'images';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// 저장 위치 및 파일 이름 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${process.env.IMAGE_FOLDER}/`);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post("/upload", upload.single('file'), (req, res) => {
  const file = req.file;
  const { user_id, description } = req.body;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  // 파일 경로
  const filePath = file.filename;
  console.log("imageid-" + uuidv4(), filePath, user_id, description)


  let query = `insert into infixel_db.images (id, image_name, user_id, description) values ('${"imageid-" + uuidv4()}', '${filePath}', '${user_id}', '${description}');`

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release(); // 연결 반환
      if (queryErr) {
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }


      res.send({ message: 'File uploaded successfully', filePath: filePath });
    });

  });




  
})



//=============================================================================
module.exports = router;
