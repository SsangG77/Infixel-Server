//라이브러리
const path = require("path");
const express = require("express");
let router = express.Router();
require("dotenv").config();

//다른 파일
const { myPrint } =require("./index")
const { pool } = require("./database");

router.post("/get", (req, res) => {
  let image_id = req.body.image_id;

  let query = `select tag from infixel_db.tags where image_id = '${image_id}';`;

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ error: "MYSQL 연결 실패" });
    }

    connection.query(query, (queryErr, results) => {
      connection.release();

      if (queryErr) {
        return res.status(500).json({ result: false });
      }

      tags = [];

      for (let i = 0; i < results.length; i++) {
        tags.push(results[i].tag);
      }
      return res.json(tags);
    });
  });
});
//=============================================================================

router.post("/search", (req, res) => {
  let search_word = req.body.search_word;

  let query = `SELECT images.id, images.image_name FROM infixel_db.images images
  JOIN (
    SELECT image_id, MAX(id) as max_tag_id
    FROM infixel_db.tags
    WHERE tag LIKE '%${search_word}%'
    GROUP BY image_id
  ) tags_grouped ON images.id = tags_grouped.image_id;
  `
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({error: "MYSQL 연결 실패"});
    }
    connection.query(query, (queryErr, results) => {
      connection.release();

      if (queryErr) {
        return res.status(500).json({ result: false });
      }
      let search_results = []

      for(let i = 0; i < results.length; i++) {
        search_result = {
          id: results[i].id,
          image_name: process.env.URL + "/image/resjpg?filename=" + results[i].image_name
        }
        search_results.push(search_result)
      }
      res.send(search_results)
    })
  })
})


//=============================================================================
module.exports = router;
