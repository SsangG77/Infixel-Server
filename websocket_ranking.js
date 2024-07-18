const sharp = require('sharp');
const WebSocket = require('ws');
const path = require('path');
require("dotenv").config();


const { pool } = require("./database");



function getimageRanking(callback) {

let query = `SELECT 
  infixel_db.images.id,
  infixel_db.images.image_name,
  infixel_db.images.description,
  infixel_db.users.id AS user_id,
  infixel_db.users.profile_image, 
  infixel_db.users.user_id AS user_at, 
  COUNT(infixel_db.pics.image_id) AS pic
      FROM infixel_db.images
      JOIN infixel_db.users ON infixel_db.images.user_id = infixel_db.users.id
      LEFT JOIN infixel_db.pics ON infixel_db.images.id = infixel_db.pics.image_id
      GROUP BY infixel_db.images.id
      ORDER BY pic desc;`

    pool.getConnection((err, connection) => {
        if (err) {
            console.log("DB 연결 실패 : ", err)
            callback(err, null)
            return
        }
        connection.query(query, (queryErr, results) => {
            connection.release();
            if ( queryErr ) {
                console.log("쿼리 실행 실패")
                callback(queryErr, null)
                return
            }
            callback(null, results)
        })
    })
}





function getUserRanking(callback) {
    let query = `SELECT
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
GROUP BY
    u.id, u.user_id, u.user_name, u.profile_image
ORDER BY
    total_likes DESC;`

    pool.getConnection((err, connection) => {
        if ( err ) {
            console.log("DB 연결 실패 : ", err)
            callback(err, null)
            return
        }
        connection.query(query, (queryErr, results) => {
            connection.release();
            if ( queryErr ) {
                console.log("쿼리 실행 실패")
                callback(queryErr, null)
                return
            }
            
            callback(null, results)
        })


    })


}






// 클라이언트에 순위 데이터를 브로드캐스트하는 함수
function broadcastRankings(wss, ranking, endpoint) {

  const data = JSON.stringify(ranking);

  //wss.clients는 웹소켓이 연결되어있는 모든 클라이언트들의 집합이다.
  wss.clients.forEach(client => { //각 클라이언트별로 로직 실행.
    if (client.readyState === WebSocket.OPEN && client.endpoint == endpoint) { //클라이언트의 상태 == 웹소켓 오픈상태일때
      client.send(data); //클아이언트로 데이터를 전송시킴.
    }
  });
}


function setupWebSocket(server) {

  const wss = new WebSocket.Server({ noServer: true });

  setInterval(() => {
    getimageRanking((err, results) => {
        if (err) {
            console.error("에러 : ", err)
            return
        }
        let image_ranking = []

        results.forEach((result, i) => {
            let json = {
                rank: i + 1,
                id: result.id,
                link: process.env.URL + "/image/resjpg?filename=" + result.image_name,
                user_nick: result.user_at,
                profile_image: process.env.URL + "/image/resjpg?filename=" + result.profile_image,
                pic: result.pic,
                description: result.description
            }
            image_ranking.push(json)
        })

        broadcastRankings(wss, image_ranking, "/imagerank");
    })
    
  }, 5000);

  setInterval(() => {
    getUserRanking(async (err, results) => {
        if (err) {
            console.error("에러 : ", err)
            return
        }
        let user_ranking = []

        // results.forEach((result, i) => {
        //     let json = {
        //         rank: i +1,
        //         id: result.id,
        //         user_id: result.user_id,
        //         profile_image: process.env.URL + "/image/resjpg?filename=" + result.profile_image,
        //         follower_count: result.follower_count.toString(),
        //         pic_count: result.total_likes.toString()
        //     }
        //     user_ranking.push(json)
        // })

        for(const [i, result] of results.entries()) {
            try {
                const resizedImageBuffer = await getResizedImage(
                    path.join(__dirname, 'images', result.profile_image),
                    100,
                    100
                );
                const base64Image = resizedImageBuffer.toString('base64');
                const imageUrl = `data:image/jpeg;base64,${base64Image}`;

                let json = {
                    rank: i + 1,
                    id: result.id,
                    user_id: result.user_id,
                    profile_image: imageUrl,
                    follower_count: result.follower_count.toString(),
                    pic_count: result.total_likes.toString()
                };
                user_ranking.push(json);



            } catch(error) {
                console.error('이미지 처리 에러:',error)
            }
        }

        broadcastRankings(wss, user_ranking, "/userrank")


    })
  }, 5000)

  // 이미지 파일의 경로를 처리하고 리사이즈된 이미지를 반환하는 함수
async function getResizedImage(imagePath, width, height) {
    try {
        const outputBuffer = await sharp(imagePath)
            .resize(width, height)
            .jpeg({ quality: 80 }) // JPEG 형식으로 압축, 품질 80%
            .toBuffer();
        return outputBuffer;
    } catch (error) {
        console.error('이미지 처리 에러:', error);
        throw error;
    }
}





  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`); //요청 URL을 파싱해서 엔드포인트인 'pathname'을 추출한다.

    if (pathname === '/imagerank' || pathname == "/userrank") { //요청 엔드포인트가 '/chart'인 경우에만 웹소켓 연결을 허용한다.
      wss.handleUpgrade(request, socket, head, (ws) => { //웹소켓 서버(wss)가 업그레이드 요청을 처리하고 ws객체를 반환한다.
        ws.endpoint = pathname; //연결된 클라이언트에 엔드포인트를 저장
        wss.emit('connection', ws, request); //connection 이벤트를 발생시키고 연결된 클라이언트를 처리한다.
      });
    } else {//요청 경로가 소켓을 파괴한다.
      socket.destroy();
    }
  });

  // WebSocket 연결 처리
  wss.on('connection', (ws) => { //새로운 클라이언트와 connection 이벤트가 발생했을때 동작한다.
    console.log('Client connected');

    // const sendRankings = () => { 
    //   ws.send(JSON.stringify(ranking_images)); //데이터를 json문자열로 변환하여 클라이언트에게 전송한다.
    // };

    // const interval = setInterval(sendRankings, 1000);

    ws.on('close', () => {
      //clearInterval(interval);
      console.log('Client disconnected');
    });
  });

  return wss;
}






module.exports = { setupWebSocket };

