const express = require("express");

// const fs = require("fs");
const mysql = require("mysql");
require("dotenv").config();

//=========================================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST, // 데이터베이스 호스트
  user: process.env.DB_USER, // 데이터베이스 사용자 이름
  password: process.env.DB_PW, // 데이터베이스 비밀번호
  database: process.env.DB_DATABASE, // 사용할 데이터베이스 이름
});

const app = express();
app.use(express.json());

const folder_name = "iu";

// 웹 서버를 3000번 포트에서 시작
app.listen(3000, () => {
  console.log("서버가 3000번 포트에서 실행 중입니다.");
});

module.exports = { pool, folder_name };

app.use("/pic", require("./pic-router"));
app.use("/user", require("./user-router"));
app.use("/image", require("./image-router"));
