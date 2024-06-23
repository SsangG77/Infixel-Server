//라이브러리
const express = require("express");
let router = express.Router();

//다른 파일
const { pool, folder_name, formatDate } = require("./index");

//============================================================

//로그인 판단 함수
router.post("/login", (req, res) => {
  let req_id = req.body.userId;
  let req_pw = req.body.userPW;
  console.log(`=== 로그인 요청 -- id : ${req_id} / pw : ${req_pw} ===`);

  let query = `select * from infixel_db.users 
  where 
  login_id = '${req_id}' 
  AND 
  login_pw = '${req_pw}'`;

  pool.getConnection((err, connection) => {
    if (err) {
      console.log("MySQL 연결 실패");
      console.log(err)
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release(); // 연결 반환
      if (queryErr) {
        console.log("쿼리 실행 실패")
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }
      let response = {
        id: "",
        user_id: "",
        user_name: "",
        created_at: "",
        profile_image: "",
        description: "",
        isLogin: false,
      };

      if (results.length == 1) {
        res.json(
          (response = {
            id: results[0].id,
            user_at: results[0].user_id,
            user_name: results[0].user_name,
            created_at: formatDate(true, results[0].created_at),
            profile_image: process.env.URL + "/image/resjpg?filename=" + results[0].profile_image,
            description: results[0].description,
            isLogin: true,
          })
        );
      } else {
        res.json(response);
      }

      // res.json(user_result);

      // console.log(results.length);
      // console.log(user_result);
    });
  });
});
//login end

//=============================================

router.post("/signup", (req, res) => {
  let id = uuidv4();
  let login_email = req.body.userEmail; //"test@test"; //이메일
  let login_pw = req.body.userPW; //"test"; //비밀번호
  let confirm_pw = req.body.confirmPW;
  let user_name = req.body.userName; //"testname"; //닉네임
  let user_id = req.body.userId; //"@test"; //@

  let insert_query = `insert into infixel_db.users (id, created_at, login_id, login_pw, user_id, user_name) values ('${id}', CURRENT_TIMESTAMP, '${login_email}', '${login_pw}', '${user_id}', '${user_name}')`;
  let select_query = `select * from infixel_db.users where login_id = '${login_email}' AND login_pw = '${login_pw}'`;

  connection.query(select_query, (queryErr, results) => {
    connection.release(); // 연결 반환
    if (queryErr) {
      return res.status(500).json({ error: "쿼리 실행 실패" });
    }

    if (results.length >= 1) {
      //가입된 회원이 있을때
      connection.query(insert_query, (queryErr, results) => {
        if (queryErr) {
          return res.status(500).json({ error: "쿼리 실행 실패" });
        }
        res.json(false);
      });
    } else {
      res.json(true);
    }

    // res.json(user_result);

    // console.log(results.length);
    // console.log(user_result);
  });
});
//sign up end

//=============================================================================
module.exports = router;
