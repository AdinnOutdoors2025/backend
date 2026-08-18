const express = require('express');
const router = express.Router();
const coinCtrl = require('../controllers/coinController');

router.post('/start', coinCtrl.startCoin);
router.post('/save', coinCtrl.saveCoinResult);

module.exports = router;
