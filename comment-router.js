//라이브러리
const express = require("express");
let router = express.Router();

require("dotenv").config();

//다른 파일
const { pool, folder_name } = require("./index");

router.post("/set", (req, res) => {
  let user_id;
  let image_id;
  let content;
  let id;
  let created_at;
});

router.post("/get", (req, res) => {
  let image_id = req.body.image_id;
  let query = `
    SELECT 
        infixel_db.comments.*, infixel_db.users.user_name, infixel_db.users.profile_image, infixel_db.users.user_id 
    FROM 
        infixel_db.comments 
    JOIN 
        infixel_db.users 
    ON 
        infixel_db.comments.user_id = infixel_db.users.id 
    where 
        image_id = '${image_id}';
    `;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }

      comment_results = [];

      for (let i = 0; i < results.length; i++) {
        comment = {
          id: results[i].id,
          created_at: formatDate(results[i].created_at),
          content: results[i].contents,
          user_id: results[i].user_id,
          image_id: results[i].image_id,
          user_name: results[i].user_name,
          profile_image: process.env.URL + "/image/resjpg?filename=" + results[i].profile_image,
        };
        comment_results.push(comment);
      }
      console.log(comment_results);
      res.json(comment_results);
    });
  });
});

// 날짜 형식을 'yyyy/mm/dd'로 변환하는 함수
function formatDate(date_val) {
  const date = new Date(date_val);
  const year = date.getUTCFullYear(); // UTC 연도
  const month = date.getUTCMonth() + 1; // UTC 월 (0-11이므로 1을 더해줌)
  const day = date.getUTCDate(); // UTC 일

  // MM과 DD 형식을 유지하기 위해, 한 자리 수일 경우 '0'을 덧붙임
  const formattedMonth = month < 10 ? `0${month}` : month;
  const formattedDay = day < 10 ? `0${day}` : day;

  return `${year}/${formattedMonth}/${formattedDay}`;
}

//=============================================================================
module.exports = router;
