const express = require("express");

const fs = require("fs");
const path = require('path');
const mysql = require("mysql");
require("dotenv").config();

//=========================================================================

const pool = mysql.createPool({
  host: process.env.DB_HOST, // 데이터베이스 호스트
  user: process.env.DB_USER, // 데이터베이스 사용자 이름
  password: process.env.DB_PW, // 데이터베이스 비밀번호
  database: process.env.DB_DATABASE, // 사용할 데이터베이스 이름
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const app = express();



/**
 * 1. 샘플 유저 10명
 * 2. 샘플 앨범 유저별 3개
 * 3. 샘플 이미지 유저별 10개 - 총 100개
 */


async function setUserData(i, image_file) {
    try {

        let album_num;
        if (i % 2 == 0) {
            album_num = 2
        } else {
            album_num = 1
        }


        const query = `
        insert into infixel_db.images (id, image_name, user_id, album_id, description) 
        values ('imageid${i}', '${image_file}','userid1', 'albumid${album_num}', 'test ${i}');
        `;
    
        pool.getConnection((err, connection) => {
            if (err) {
              return res.status(500).json({ error: "MySQL 연결 실패" });
            }
        
            connection.query(query, (queryErr, results) => {
              connection.release(); // 연결 반환
              if (queryErr) {
                return res.status(500).json({ error: "쿼리 실행 실패" });
              }

            });
          });
    
      } catch (error) {
        console.error('Error inserting data:', error);
      }
}

function getFileName() {
    const directoryPath = './images'; // 폴더 경로를 지정합니다.
    let i = 8;

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return console.error('Unable to scan directory: ' + err);
        }

        // 파일 이름을 정렬합니다.
        files = files.filter(file => file !== '.DS_Store').sort();

        let index = 0;
        // 파일 이름을 순서대로 출력합니다.
        function printNextFile() {
            if (index < files.length) {
                setUserData(i, files[index])
                index++;
                i++
                setTimeout(printNextFile, 3000); // 3초 후에 다음 파일 이름 출력
            }
        }
    
        printNextFile();
    });
}


async function setCommentData(commentNum, userNum, imageNum) {
    //insert into infixel_db.comments (id, contents, user_id, image_id) values ('commentid1', 'comment test 1', 'userid1', 'imageid1');


    let query = `insert into infixel_db.comments (id, contents, user_id, image_id) 
    values 
    ('commentid${commentNum}', 'comment test ${commentNum}', 'userid${userNum}', 'imageid${imageNum}');`;
    

    try {
        pool.getConnection((err, connection) => {
            if (err) {
              return res.status(500).json({ error: "MySQL 연결 실패" });
            }
        
            connection.query(query, (queryErr, results) => {
              connection.release(); // 연결 반환
              if (queryErr) {
                return res.status(500).json({ error: "쿼리 실행 실패" });
              }
            

            });
          });



    } catch(error) {
        console.error('Error inserting data:', error);
    }
}

function loopQuery() {
    let user_count = 10;
    let image_count = 5;
    let comment_id = 1;
    let delay = 0;

    for (let i = 1; i <= image_count; i++) {
        for (let j = 1; j <= user_count; j++) {
            setTimeout((commentId, userId, imageId) => {
                setCommentData(commentId, userId, imageId);
            }, delay, comment_id, j, i);
            comment_id++;
            delay += 3000;  // 3 seconds delay
        }
    }
}

