const express = require("express");

//websocket
const http = require("http");
const WebSocket = require("ws");

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

const folder_name = "images";

// 웹 서버를 3000번 포트에서 시작
// app.listen(3000, () => {
//   console.log("서버가 3000번 포트에서 실행 중입니다.");
// });

module.exports = { pool, folder_name, formatDate };

app.use("/pic", require("./pic-router"));
app.use("/user", require("./user-router"));
app.use("/image", require("./image-router"));
app.use("/comment", require("./comment-router"));
app.use("/imagealbums", require("./albums-router"));
app.use("/tags", require("./tags-router"));

///////////////////////////////////////
function formatDate(type, date_val) {
  if (type) {
    const date = new Date(date_val);
    const year = date.getUTCFullYear(); // UTC 연도
    const month = date.getUTCMonth() + 1; // UTC 월 (0-11이므로 1을 더해줌)
    const day = date.getUTCDate(); // UTC 일

    // MM과 DD 형식을 유지하기 위해, 한 자리 수일 경우 '0'을 덧붙임
    const formattedMonth = month < 10 ? `0${month}` : month;
    const formattedDay = day < 10 ? `0${day}` : day;

    return `${year}/${formattedMonth}/${formattedDay}`;
  } else {
    let date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}






//websocket 테스트

// Express HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

// 순위 데이터
let rankings = [
  { name: "User1", score: 100 },
  { name: "User2", score: 95 },
  { name: "User3", score: 90 },
];

// 클라이언트에 순위 데이터를 브로드캐스트하는 함수
function broadcastRankings() {
  const data = JSON.stringify(rankings);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// 배열을 무작위로 섞는 함수 (Fisher-Yates 알고리즘)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// 1초마다 순위 데이터를 무작위로 섞고 브로드캐스트
setInterval(() => {
  shuffleArray(rankings);
  broadcastRankings();
}, 1000);


// WebSocket 연결 처리
wss.on("connection", ws => {
  console.log("Client connected");
  ws.send(JSON.stringify(rankings)); // 초기 순위 데이터를 전송

  ws.on("message", message => {
    console.log("Received:", message);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});


// 웹 서버를 3000번 포트에서 시작
server.listen(3000, () => {
  console.log("서버가 3000번 포트에서 실행 중입니다.");
});


