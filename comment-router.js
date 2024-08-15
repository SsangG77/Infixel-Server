//라이브러리
const express = require("express");
let router = express.Router();
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();

//다른 파일
const {formatDate, sendNotification } = require("./index");
const { pool } = require("./database");


//========================= comment set ========================
router.post("/set", (req, res) => {
  let id = uuidv4();
  let created_at = formatDate(false, "");
  let content = req.body.content;
  let user_id = req.body.user_id; //댓글 작성하는 유저
  let image_id = req.body.image_id; //작성되는 이미지 아이디


  let insertQuery = `insert into infixel_db.comments values ('${id}','${content}', '${user_id}', '${image_id}', '${created_at}');`;
  let getUserQuery = `
    select c.contents, u.id, u.device_token 
      from 
    infixel_db.comments as c 
      join 
    infixel_db.images as i 
      on c.image_id = i.id
      join
    infixel_db.users as u
      on u.id = i.user_id 
      where i.id = '${image_id}'
      ;
    `
  
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error : "MySQL 연결 실패."})
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error : "트랜잭션 시작 실패."})
      }

      connection.query(getUserQuery, (queryErr, results) => {
        if (queryErr) {
          return connection.rollback(() => {
            connection.release();
            return res.status(500).json({result: false})
          })
        }

        let device_token = results[0].device_token;
        sendNotification(device_token, `회원님의 사진에 '${content}'댓글이 작성되었습니다.`)

        connection.query(insertQuery, (queryErr) => {
          if (queryErr) {
            return connection.rollback(() => {
              connection.release();
              return res.status(500).json({ result : false})
            })
          }

          connection.commit((err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                return res.status(500).json({ error: "트랜잭션 커밋 실패."})
              })
            }
            connection.release();
            return res.json({ result: true})
          })
        })
      })
    })
  })
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
          profile_image: process.env.URL + "/image/resjpg?filename=" + results[i].profile_image + "&profileimage=true",
        };
        comment_results.push(comment);
      }
      
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
      res.send(results[0].count.toString())

    });
  });
});

////=================================================================


//=============================================================================
module.exports = router;
