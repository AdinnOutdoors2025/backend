const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

router.post('/set-limit', adminCtrl.setLimit);
router.get('/limit', adminCtrl.getLimit);
router.get('/dashboard', adminCtrl.getDashboard);

module.exports = router;
