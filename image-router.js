//라이브러리
const path = require("path");
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const express = require("express");
let router = express.Router();
require("dotenv").config();

//다른 파일
const {folder_name } = require("./index");
const { pool } = require("./database");

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
  FROM 
    infixel_db.images
  JOIN 
    infixel_db.users ON infixel_db.images.user_id = infixel_db.users.id
  LEFT JOIN 
    infixel_db.pics ON infixel_db.images.id = infixel_db.pics.image_id
  GROUP BY 
    infixel_db.images.id
  ORDER BY RAND()
  LIMIT 1;
  `

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
        profile_image: process.env.URL + "/image/resjpg?filename=" + results[0].profile_image + "&profileimage=true",
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

  //
  const profileImageOrNot = req.query.profileimage === 'true';
  const filePath = path.join(__dirname, folder_name, `${fileName}`);

  if(profileImageOrNot) {
    sharp(filePath)
    .resize(300, 300)
    .toBuffer()
    .then(data => {
      res.set('Content-Type', 'image/jpeg');
      res.send(data);
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('이미지 리사이징 에러')
    })
  } else {
    res.sendFile(filePath)
  }
  //


  //const filePath = path.join(__dirname, folder_name, `${fileName}`);
  // res.sendFile(filePath);
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
        profile_image: process.env.URL + "/image/resjpg?filename=" + results[0].profile_image + "&profileimage=true",
        pic: results[0].pic,
      };
     
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


router.post("/upload", upload.single('file'), async (req, res) => {
  const file = req.file;

  const { user_id, description } = req.body;
  
  var imageId = "imageid-"+ uuidv4()
  const filePath = file.filename;

  //태그 처리 부분
  const tags = req.body.tags; 
  const tagsArray = Array.isArray(tags) ? tags : [tags];
  


  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  //1. 태그가 입력되었는지 아닌지
  if (tags == undefined) {
    console.log("images-router /upload : 입력된 태그 없음.")
  } else {
    console.log("image-router /upload : ", tagsArray)


    //====

    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Connection 에러 :", err)
        res.status(500).json({ error: "Mysql 에러"})
        return;
      }

      connection.beginTransaction(async (err) => {
        if (err) {
          connection.release();
          console.error("Error starting transaction : ", err)
          res.status(500).json({ error : "Mysql 트렌직션 에러"})
          return;
        }

        try {
          let query = `insert into infixel_db.images (id, image_name, user_id, description) values (?, ?, ?, ?);`
          connection.query(query, [imageId, filePath, user_id, description], (err, result) => {
            if (err) {
              connection.rollback(() => {
                connection.release();
                console.error("이미지 업로드 에러", err);
                res.status(500).json({ error: "데이터베이스 insert error"})
              })
              return;
            }
            const tagQuery = 'insert into infixel_db.tags (id, tag, image_id) values (?, ?, ?);'
            const tagPromises = tagsArray.map((tag) => {
              return new Promise((resolve, reject) => {
                connection.query(tagQuery, ["tagid-"+uuidv4(), tag, imageId], (err) => {
                  if (err) {
                    reject(err)
                  } else {
                    resolve();
                  }
                });
              });
            });

            Promise.all(tagPromises)
            .then(() => {
              connection.commit((err) => {
                if (err) {
                  connection.rollback(() => {
                    connection.release();
                    console.error('Error committing transaction:', err);
                    res.status(500).json({ error: 'Database commit error' });
                  })
                  return
                }

                connection.release();
                res.send({ message: '업로드 완료', filePath: filePath });

              })
            })
            .catch((err) => {
              connection.rollback(() => {
                connection.release();
                console.error('태그 입력 에러', err);
                res.status(500).json({ error: '데이터베이스 입력 에러'})
              })
            })

          })

        } catch {
          connection.rollback(() => {
            connection.release();
            console.error(error);
            res.status(500).json({ error: '데이터베이스 에러'})
          })
        }


      })

    })
  }
})


//==================================================================================================



router.post("/report", (req, res) => {
  let imageId = req.body.image_id;
  let userId = req.body.user_id;

  let select_query = `SELECT * FROM infixel_db.report_image WHERE user_id = ? AND image_id = ?;`;
  let insert_query = `INSERT INTO infixel_db.report_image (user_id, image_id) VALUES (?, ?);`;

  pool.getConnection((err, connection) => {
    if (err) {
      console.log("MYSQL 연결 실패");
      return res.status(500).json({ error: "MYSQL 연결 실패" });
    }

    connection.query(select_query, [userId, imageId], (queryErr, results) => {
      if (queryErr) {
        connection.release();
        console.log("쿼리 에러");
        return res.status(500).send(false);;
      }

      if (results.length === 0) { // 값이 없을 때
        connection.query(insert_query, [userId, imageId], (queryErr, results) => {
          connection.release();
          if (queryErr) {
            console.log("쿼리 에러");
            return res.status(500).send(false);;
          }

          return res.send(true);
        });
      } else { // 값이 있을 때
        connection.release();
        return res.send(false);
      }
    });
  });
});

//==================================================================================


router.post("/myimage", (req, res)=> {
  let user_id = req.body.user_id;

  let query = `
    select id, image_name from infixel_db.images where user_id = '${user_id}';
        `

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySql 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ result: false });
      }

      let images = [];

      for(let i = 0; i < results.length; i++) {
        let image = {
          id: results[i].id,
          image_name: process.env.URL + "/image/resjpg?filename=" + results[i].image_name
        }
        images.push(image)
      }
      return res.json(images);
    });
  });

})




//=============================================================================
module.exports = router;
