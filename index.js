const express = require("express");
const { v4: uuidv4 } = require('uuid');
const http = require("http");
const { setupWebSocket } = require('./websocket_ranking');



//=========================================================================


const app = express();
app.use(express.json());

const folder_name = "images";

module.exports = { folder_name, formatDate };

app.use("/pic", require("./pic-router"));
app.use("/user", require("./user-router"));
app.use("/image", require("./image-router"));
app.use("/comment", require("./comment-router"));
app.use("/imagealbums", require("./albums-router"));
app.use("/tags", require("./tags-router"));

/////////////////////////////////////// module ==============================
function formatDate(type, date_val) {
  if (type) {
    const date = new Date(date_val);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

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



// Express HTTP 서버 생성
const server = http.createServer(app);

// WebSocket 설정
setupWebSocket(server);

// 웹 서버를 3000번 포트에서 시작
server.listen(3000, () => {
  console.log("서버가 3000번 포트에서 실행 중입니다.");
});



