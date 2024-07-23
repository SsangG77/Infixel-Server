//라이브러리
const path = require("path");
const express = require("express");
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
let router = express.Router();
require("dotenv").config();

//다른 파일
const {folder_name, formatDate } = require("./index");
const { pool } = require("./database");

router.post("/get", (req, res) => {
  let user_id = req.body.user_id;

  //let query = `SELECT id, created_at, album_name, profile_image FROM infixel_db.albums where user_id = '${user_id}';`;
  let query = `SELECT 
  albums.id, 
  albums.created_at, 
  albums.album_name, 
  albums.profile_image, 
  (select COUNT(*) from infixel_db.album_images where album_id = albums.id) as total 
  from 
  infixel_db.albums albums where user_id = '${user_id}';
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySql 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ results: false });
      }

      albums = [];

      for (let i = 0; i < results.length; i++) {
        album = {
          id: results[i].id,
          created_at: formatDate(true, results[i].created_at),
          profile_link: process.env.URL + "/image/resjpg?filename=" + results[i].profile_image,
          album_name: results[i].album_name,
          count: results[i].total,
        };
        albums.push(album);
      }
      return res.json(albums);
    });
  });
});
//============================================================================================

router.post("/set", (req, res) => {
  let album_id = req.body.album_id;
  let image_id = req.body.image_id;

  let query = `insert into infixel_db.album_images values ('${image_id}', '${album_id}');`;
console.log(query)
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySql 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();

      if (queryErr) {
        return res.status(500).json({ result: false });
      }
      return res.json({ result: true });
    });
  });
});
//===================================================================================

router.post("/search", (req, res) => {
  let search_word = req.body.search_word;
  let query = `SELECT 
  albums.id, 
  albums.created_at, 
  albums.album_name, 
  albums.profile_image, 
  (select COUNT(*) from infixel_db.album_images where album_id = albums.id) as total 
  from 
  infixel_db.albums albums where album_name LIKE '%${search_word}%';
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySql 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ results: false });
      }

      albums = [];

      for (let i = 0; i < results.length; i++) {
        album = {
          id: results[i].id,
          created_at: formatDate(true, results[i].created_at),
          profile_link: process.env.URL + "/image/resjpg?filename=" + results[i].profile_image,
          album_name: results[i].album_name,
          count: results[i].total,
        };
        albums.push(album);
      }
      return res.json(albums);
    });
  });

})
//============================================================================================

router.post("/images", (req, res) => {
  let album_id = req.body.album_id;
  let query = `
  SELECT 
    infixel_db.images.id,
    infixel_db.images.image_name
  FROM 
      infixel_db.images
  JOIN 
      infixel_db.users ON infixel_db.images.user_id = infixel_db.users.id
  LEFT JOIN 
      infixel_db.pics ON infixel_db.images.id = infixel_db.pics.image_id
  WHERE 
      infixel_db.images.id IN (
          SELECT
              i.id
          FROM 
              infixel_db.album_images a_i 
          LEFT JOIN 
              infixel_db.images i ON a_i.image_id = i.id
          WHERE 
              a_i.album_id = '${album_id}'
      )
  GROUP BY 
      infixel_db.images.id;
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySql 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ results: false });
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
//======================================================================================

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

router.post("/add", upload.single('file'), async (req, res) => {
  const file = req.file;
  const { user_id, album_name } = req.body;

  var albumId = "albumid-"+ uuidv4()
  const filePath = file.filename;

  if (!file) {
    return res.status(400).send('No file uploaded');
  }


  let query = `insert into infixel_db.albums (id, album_name, user_id, profile_image) values
   ('${albumId}', '${album_name}', '${user_id}', '${filePath}');`

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({error: "MYSQL 연결 실패"});
    }
    connection.query(query, (queryErr, results) => {
      connection.release();

      if (queryErr) {
        return res.status(500).json({ result: false });
      }
      res.send({ message: '업로드 완료', filePath: filePath });
      
    })
  })


  

})




module.exports = router;
