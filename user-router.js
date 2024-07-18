//라이브러리
const express = require("express");
let router = express.Router();

//다른 파일
const { formatDate } = require("./index");
const { pool } = require("./database");

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

  });
});
//sign up end


router.post("/search", (req, res) => {
  let user_search = req.body.search_word;

  let query = `
  SELECT
    u.id,
    u.user_id,
    u.user_name,
    u.profile_image,
    COUNT(DISTINCT f.user_id) AS follower_count,
    COUNT(DISTINCT p.image_id) AS total_likes
FROM
    infixel_db.users u
LEFT JOIN
    infixel_db.follows f ON u.id = f.follow_user_id
LEFT JOIN
    infixel_db.images i ON u.id = i.user_id
LEFT JOIN
    infixel_db.pics p ON i.id = p.image_id
where u.user_name LIKE '%${user_search}%' OR u.user_id LIKE '%${user_search}%'
GROUP BY
    u.id, u.user_id, u.user_name, u.profile_image
ORDER BY
    total_likes DESC;
  `

  pool.getConnection((err, connrction) => {
    if (err) {
      return res.status(500).json({ error: "Mysql 연결 실패"})
    }

    connrction.query(query, (querryErr, results) => {
      connrction.release();
      if ( querryErr) {
        return res.status(500).json({ error: " user search 쿼리 실행 실패"})
      }

      user_search_results = []

      for (let i = 0; i < results.length; i++) {
        user = {
          id: results[i].id,
          user_id: results[i].user_id,
          user_name: results[i].user_name,
          profile_image: process.env.URL + "/image/resjpg?filename=" + results[i].profile_image,
          follower_count: results[i].follower_count.toString(),
          pic_count: results[i].total_likes.toString()
        }
        user_search_results.push(user)
      }
      res.json(user_search_results)

    })

  })



})


//=============================================================================
module.exports = router;
