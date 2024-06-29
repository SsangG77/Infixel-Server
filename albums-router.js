//라이브러리
const path = require("path");
const express = require("express");
let router = express.Router();
require("dotenv").config();

//다른 파일
const { pool, folder_name, formatDate } = require("./index");

router.post("/get", (req, res) => {
  let user_id = req.body.user_id;
  console.log(req.body.user_id);

  //let query = `SELECT id, created_at, album_name, profile_image FROM infixel_db.albums where user_id = '${user_id}';`;
  let query = `SELECT 
  albums.id, 
  albums.created_at, 
  albums.album_name, 
  albums.profile_image, 
  (select COUNT(*) from infixel_db.album_images where album_id = albums.id) as total 
  from 
  infixel_db.albums albums where user_id = '${user_id}';
  `;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySql 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();
      if (queryErr) {
        return res.status(500).json({ results: false });
      }

      albums = [];

      for (let i = 0; i < results.length; i++) {
        album = {
          id: results[i].id,
          created_at: formatDate(true, results[i].created_at),
          profile_link: process.env.URL + "/image/resjpg?filename=" + results[i].profile_image,
          album_name: results[i].album_name,
          count: results[i].total,
        };
        albums.push(album);
      }
      return res.json(albums);
    });
  });
});

router.post("/set", (req, res) => {
  let album_id = req.body.album_id;
  let image_id = req.body.image_id;

  let query = `insert into infixel_db.album_images values ('${album_id}', '${image_id}');`;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MySql 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();

      if (queryErr) {
        return res.status(500).json({ result: false });
      }
      console.log(results);
      return res.json({ result: true });
    });
  });
});

//=============================================================================
module.exports = router;
