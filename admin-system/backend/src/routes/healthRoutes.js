const express = require("express");
const { getKafkaState } = require("../services/kafka");

// Health check endpoint returning system and Kafka status
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    kafka: getKafkaState(),
  });
});

module.exports = router;
