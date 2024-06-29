//라이브러리
const express = require("express");
let router = express.Router();
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();

//다른 파일
const { pool, folder_name, formatDate } = require("./index");


//========================= comment set ========================
router.post("/set", (req, res) => {
  let id = uuidv4();
  let created_at = formatDate(false, "");
  let content = req.body.content;
  let user_id = req.body.user_id;
  let image_id = req.body.image_id;

  console.log("=============== comment set ===============");
  console.log(`content : ${content}, image_id : ${image_id}`);
  console.log("");

  let query = `insert into infixel_db.comments values ('${id}', '${created_at}', '${content}', '${user_id}', '${image_id}')`;
  
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySQL 연결 실패" });
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
//============================================================



//==================== comment get ================================
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
          created_at: formatDate(true, results[i].created_at),
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
//============================================================


//==================== comment count ================================
router.post("/count", (req, res) => {
  let image_id = req.body.image_id;
  let query = `
      select COUNT(*) as count from infixel_db.comments where image_id = '${image_id}';
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
      console.log(results[0].count)
      res.send(results[0].count.toString())

    });
  });
});

////=================================================================


//=============================================================================
module.exports = router;
