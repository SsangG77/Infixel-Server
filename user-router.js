//라이브러리
const express = require("express");
const path = require("path");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const multer = require('multer');

let router = express.Router();


//다른 파일
const { formatDate, sendNotification, myPrint } = require("./index");
const { pool } = require("./database");

//============================================================

//로그인 판단 함수
router.post("/login", (req, res) => {
  let req_id = req.body.userId;
  let req_pw = req.body.userPW;
  let device_token = req.body.deviceToken
  // console.log(`=== 로그인 요청 -- id : ${req_id} / pw : ${req_pw} / 디바이스 토큰 : ${device_token} ===`);
  myPrint("로그인 요청", `id : ${req_id}\npw: ${req_pw}\ndevice token: ${device_token}`)

  let select_query = `select * from infixel_db.users 
  where 
  login_id = ?
  AND 
  login_pw = ?
  `;

  let update_query = `
    UPDATE infixel_db.users set device_token = ? where login_id = ? and login_pw = ?
  `



  pool.getConnection((err, connection) => {
    if (err) {
      console.log("MySQL 연결 실패");
      console.log(err)
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(select_query, [req_id, req_pw], (queryErr, results) => {
      
      if (queryErr) {
        console.log("쿼리 실행 실패")
        connection.release(); // 연결 반환
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }

      if (results[0].device_token != device_token) { //디바이스 토큰이 다를 경우에는 바꿔줘야함
        connection.query(update_query, [device_token, req_id, req_pw], (queryErr, results) => {
          
          if (queryErr) {
            connection.release();
            return res.status(500).json({ error : "쿼리 실행 실패"})
          }
        })
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
            profile_image: process.env.URL + "/image/resjpg?filename=" + results[0].profile_image + "&profileimage=true",
            description: results[0].description,
            isLogin: true,
          })
        );
      } else {
        res.json(response);
      }
      connection.release();

    });
  });
});
//login end

//==============================================================================

router.post("/kakaologin", (req, res) => {
  let id = "kakao_"+uuidv4();
  let login_id = req.body.kakao_id;
  let nick_name = req.body.nick_name;
  let device_token = req.body.device_token;

  myPrint("/kakaologin", ` id : ${id} \n login_id : ${login_id} \n nick_name : ${nick_name} \n device_token : ${device_token}`)

  let select_query = "select * from infixel_db.users where login_id = ?"
  let insert_query = "insert into infixel_db.users (id, created_at, login_id, user_name, device_token, profile_image) values (?, CURRENT_TIMESTAMP, ?, ?, ?, ?)"
  let update_query = "update infixel_db.users set device_token = ? where login_id = ?"

  pool.getConnection((err, connection) => {
    if (err) {
      console.log("MySQL 연결 실패");
      console.log(err)
      return res.status(500).json({ error: "MySQL 연결 실패" });
    }

    connection.query(select_query, [login_id], (queryErr, results) => {
      
      if (queryErr) {
        connection.release(); // 연결 반환
        return res.status(500).json({ error: "쿼리 실행 실패" });
      }
  
      if (results.length >= 1) { //가입된 회원이 있을때
        if (results[0].device_token != device_token) { //디바이스 토큰이 다를 때
  
          connection.query(update_query, [device_token, login_id], (queryErr, results) => {
            if (queryErr) {
              connection.release();
              return res.status(500).json({ error: "업데이트 쿼리 실행 실패"})
            }
          }) //update query
        } 
          return res.json({
            id : results[0].id,
            user_at : results[0].user_id == null ? "" : results[0].user_id,
            user_name : results[0].user_name == null ? "" : results[0].user_name,
            created_at : formatDate(true, results[0].created_at),
            profile_image : process.env.URL + "/image/resjpg?filename=" + results[0].profile_image + "&profileimage=true",
            description: results[0].description == null ? "" : results[0].description,
            isLogin: true


          })
        
      } else {
        connection.query(insert_query, [id, login_id, nick_name, device_token, "default.png"], (queryErr, results) => {
          if (queryErr) {
            return res.status(500).json({ error: "쿼리 실행 실패" });
          }

          return res.json({
            id : id,
            user_at : "",
            user_name : nick_name,
            created_at : "",
            profile_image : process.env.URL + "/image/resjpg?filename=default.png&profileimage=true",
            description: "",
            isLogin: true


          })
          
        });
      }
      
    });
    connection.release();  
  })
})





//==============================================================================

router.post("/signup", (req, res) => {
  let id = uuidv4();
  let login_email = req.body.userEmail;     //"test@test"; //이메일
  let login_pw = req.body.userPW;           //"test"; //비밀번호
  let confirm_pw = req.body.confirmPW;
  let user_name = req.body.userName;        //"testname"; //닉네임
  let user_id = req.body.userId;            //"@test"; //@
  let device_token = req.body.deviceToken   //유저 디바이스 토큰

  let insert_query = `insert into infixel_db.users (id, created_at, login_id, login_pw, user_id, user_name, device_token) values ('${id}', CURRENT_TIMESTAMP, '${login_email}', '${login_pw}', '${user_id}', '${user_name}', ${device_token})`;
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
          profile_image: process.env.URL + "/image/resjpg?filename=" + results[i].profile_image + "&profileimage=true",
          follower_count: results[i].follower_count.toString(),
          pic_count: results[i].total_likes.toString()
        }
        user_search_results.push(user)
      }
      res.json(user_search_results)

    })

  })
})
//===============================================================================

router.post("/profile", (req, res) => {
  let user_id = req.body.user_id;

  let quary = `
  SELECT
	u.id,
    u.user_id as user_at,
    u.user_name as user_id,
    u.profile_image,
    u.description,
    COUNT(DISTINCT f2.follow_user_id) AS follow_count,
    count(distinct f1.user_id) AS follower_count,
    COUNT(DISTINCT p.image_id) AS pic
  FROM
      infixel_db.users u
  LEFT JOIN
      infixel_db.follows f1 ON u.id = f1.follow_user_id
  left Join
    infixel_db.follows f2 ON u.id = f2.user_id
  LEFT JOIN
      infixel_db.images i ON u.id = i.user_id
  LEFT JOIN
      infixel_db.pics p ON i.id = p.image_id
  where u.id = '${user_id}'
  group BY
      u.id, u.user_id, u.user_name, u.profile_image;
    `
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({error: "연결 실패"})
    }
    connection.query(quary, (queryErr, results) => {
      connection.release();
      if(queryErr) {
        return res.status(500).json({results: false})
      }
      let r = results[0]
      let user = {
        id: r.id,
        user_at: r.user_at,
        user_id: r.user_id,
        pic: r.pic,
        follow: r.follow_count,
        follower: r.follower_count,
        description: r.description == null ? "" : r.description,
        profile_image: process.env.URL + "/image/resjpg?filename=" + r.profile_image + "&profileimage=true"
      }
      res.json(user)
    })
  })
})
//===============================================================================


router.post("/follow", (req, res) => {
  let userId = req.body.user_id
  let followUser = req.body.follow_user_id
  
  let insertQuery = `
    insert into infixel_db.follows value ('${userId}', '${followUser}');
  `

  let getUserQuery = `select user_name, device_token from infixel_db.users where id = '${followUser}'`

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error : "MYSQL 연결 실패"})
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ error : "트랜직션 시작 실패."})
      }

      connection.query(getUserQuery, (queryErr, results) => {
        if (queryErr) {
          return connection.rollback(() => {
            connection.release();
            return res.status(500).json({ result : false})
          })
        }

        let device_token = results[0].device_token;
        let user_name = results[0].user_name;
        sendNotification(device_token, `'${user_name}'님이 회원님을 팔로우 했습니다.`);

        connection.query(insertQuery, (queryErr) => {
          if (queryErr) {
            return connection.rollback(() => {
              connection.release();
              return res.status(500).json({ result : false})
            })
          }
          connection.release();
          return res.json({ result: true})
        })
      })
    })
  })
})
//===============================================================================

router.post("/unfollow", (req, res) => {
  let userId = req.body.user_id
  let followUser = req.body.unfollow_user_id

  let query = `delete from infixel_db.follows where user_id = '${userId}' AND follow_user_id = '${followUser}';`

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
})

//=============================================================================

router.post("/followornot", (req, res) => {
  let userId = req.body.user_id
  let followUser = req.body.follow_user_id

  let query = `select * from infixel_db.follows where user_id = '${userId}' and follow_user_id = '${followUser}';`

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error : "MySql 연결 시류ㅐ"});
    }
    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ error: queryErr });
      }
      if (results.length == 1) {
        return res.json(true);
      } else {
        return res.json(false)
      }
    });
  })
})
//=============================================================================

router.post("/profile-image", (req, res) => {
  let user_id = req.body.user_id

  let query = "select profile_image from infixel_db.users where id = ?"

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "mysql 연결 실패"})
    }

    connection.query(query, [user_id], (querryErr, results) => {
      connection.release();
      if(querryErr) {
        return res.status(500).json({ result: false})
      }

      fs.readFile(path.join(__dirname, `images/${results[0].profile_image}`), (err, data) => {
        if (err) {
          return res.status(500).send("Error reading image")
        }

        res.json({
          image: data.toString('base64')
        })
      })
    })
  })
})


//=============================================================================

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

router.post("/update", upload.single('file'), async (req, res) => {
  const file = req.file;
  const { nick_name, user_id, description } = req.body;
  const filePath = file.filename;

  if (!file) {
    return res.status(400).send('No file uploaded');
  }


  res.send({ message: '프로필 수정 완료', filePath: filePath });

})







//=============================================================================
module.exports = router;
