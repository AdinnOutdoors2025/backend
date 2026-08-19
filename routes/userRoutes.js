const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/userController');

router.get('/check-limit', userCtrl.checkLimit);
router.post('/session', userCtrl.startSession);
router.post('/add', userCtrl.addUser);
router.get('/phone/:phone', userCtrl.getUserByPhone);
router.get('/list', userCtrl.listByDate);

module.exports = router;
