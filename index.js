const express = require("express");
const { v4: uuidv4 } = require('uuid');
const http = require("http");
const { setupWebSocket } = require('./websocket_ranking');
const apn = require('apn');


//=========================================================================


const app = express();
app.use(express.json());

const folder_name = "images";

module.exports = { folder_name, formatDate, sendNotification };

app.use("/pic", require("./pic-router"));
app.use("/user", require("./user-router"));
app.use("/image", require("./image-router"));
app.use("/comment", require("./comment-router"));
app.use("/imagealbums", require("./albums-router"));
app.use("/tags", require("./tags-router"));

//=========================================================================
const apnProvider = new apn.Provider({
  token : {
    key: "../keys/AuthKey_QYN32RD8A2.p8",
    keyId: "QYN32RD8A2",
    teamId: "M3KH86595Z"
  },
  production: false //정식 배포때 true로 변경
})


// 특정 디바이스 토큰으로 알림 보내기
function sendNotification(deviceToken, alertText) {
  let notification = new apn.Notification();

  notification.topic = "com.sangjin.Infixel"; // 앱의 번들 식별자
  notification.alert = alertText;             // 푸시 알림 메시지
  notification.sound = "default";             // 기본 알림 소리 설정
  notification.payload = {
    "message" : alertText
  }
  notification.aps = {
    "alert": alertText,
    "sound": "default",
    "content-available": 1                    // 백그라운드 실행 플래그
  };
  

  // 알림 전송
  apnProvider.send(notification, deviceToken).then(result => {

    // 실패한 경우의 상세 정보
    if (result.failed.length > 0) {
      console.log("Failures:", result.failed);
    }
  }).catch(error => {
    console.error("Error sending notification:", error);
  });
}




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



