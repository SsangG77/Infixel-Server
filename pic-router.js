//라이브러리
const express = require("express");
let router = express.Router();

//다른 파일
const { pool, folder_name } = require("./index");

//유저가 해당 이미지의 pic 버튼을 눌렀을때 처리 함수
router.post("/up", (req, res) => {
  //좋아요한 이미지, 좋아요 누른 유저 둘다 pic 테이블에 insert
  //유저가 앱에서 로그인할때 유저 id 를 받아서 로그인 상태일때 기기에 저장하고 있어야함.

  let image_id = req.body.image_id;
  let user_id = req.body.user_id;

  console.log("==== /up ====");
  console.log(image_id);
  console.log(user_id);

  let query = `insert into infixel_db.pics values ('${user_id}', '${image_id}')`;

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

//유저가 해당 이미지의 pic을 취소했을때 처리 함수
router.post("/down", (req, res) => {
  //누른 유저의 id와 이미지 id가 일치하는 테이블의 row값을 지우기

  let image_id = req.body.image_id;
  let user_id = req.body.user_id;

  console.log("==== /down ====");
  console.log(image_id);
  console.log(user_id);

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
