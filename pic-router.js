//라이브러리
const express = require("express");
let router = express.Router();

//다른 파일
const { sendNotification } = require("./index")
const { pool } = require("./database");

//유저가 해당 이미지의 pic 버튼을 눌렀을때 처리 함수
router.post("/up", (req, res) => {
  let image_id = req.body.image_id;
  let user_id = req.body.user_id;

  let getUserQuery = `
    SELECT 
      infixel_db.images.user_id,
      infixel_db.users.device_token
    FROM 
      infixel_db.images 
    JOIN 
      infixel_db.users 
    ON 
      infixel_db.users.id = infixel_db.images.user_id
    WHERE 
      infixel_db.images.id = ?
    AND
      infixel_db.images.user_id != ?;
  `;

  let insertPicQuery = `
    INSERT INTO infixel_db.pics (user_id, image_id) VALUES (?, ?);
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySQL 연결 실패." });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error: "트랜잭션 시작 실패." });
      }

      connection.query(getUserQuery, [image_id, user_id], (queryErr, results) => {
        if (queryErr) {
          return connection.rollback(() => {
            connection.release();
            return res.status(500).json({ result: false });
          });
        }

        let device_token = results[0].device_token;
        sendNotification(device_token, "회원님의 사진을 Pic!했습니다.");

        connection.query(insertPicQuery, [user_id, image_id], (queryErr, results) => {
          if (queryErr) {
            return connection.rollback(() => {
              connection.release();
              return res.status(500).json({ result: false });
            });
          }

          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                return res.status(500).json({ error: "트랜잭션 커밋 실패." });
              });
            }

            connection.release();
            return res.json({ result: true });
          });
        });
      });
    });
  });
});


//유저가 해당 이미지의 pic을 취소했을때 처리 함수
router.post("/down", (req, res) => {
  //누른 유저의 id와 이미지 id가 일치하는 테이블의 row값을 지우기

  let image_id = req.body.image_id;
  let user_id = req.body.user_id;


  let query = `delete from infixel_db.pics where image_id = '${image_id}' AND user_id = '${user_id}'`;

  pool.getConnection((err, connection) => {
    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ result: false });
      }
      return res.json({ result: true });
    });
  });
});

//pic한 유무 판단 함수
router.post("/ornot", (req, res) => {
  let image_id = req.body.image_id;
  let user_id = req.body.user_id;

  let query = `select * from infixel_db.pics where user_id ='${user_id}' AND image_id = '${image_id}'`;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }

      if (results.length >= 1) {
        res.json({ result: true });
      } else {
        res.json({ result: false });
      }
    });
  });
});

//=============================================================================
module.exports = router;
