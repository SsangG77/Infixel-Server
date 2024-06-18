//라이브러리
const path = require("path");
const express = require("express");
let router = express.Router();
require("dotenv").config();

//다른 파일
const { pool, folder_name } = require("./index");

//=================================================================

let randomImgCount = 0;
router.get("/randomimage", (req, res) => {
  console.log(`random image ${randomImgCount}번째 동작`);
  randomImgCount++;

  let query = `SELECT infixel_db.images.*, infixel_db.users.profile_image, infixel_db.users.user_id AS user_at, COUNT(infixel_db.pics.image_id) AS pic
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
      console.log("======== results =========");
      console.log(results[0]);
      console.log("");

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

  const filePath = path.join(__dirname, folder_name, `${fileName}.jpg`);
  res.sendFile(filePath);
});

//=============================================================================
module.exports = router;
