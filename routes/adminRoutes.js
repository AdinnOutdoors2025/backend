const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

router.get('/settings', adminCtrl.getSettings);
router.post('/active-slot', adminCtrl.setActiveSlot);
router.get('/campaign-days', adminCtrl.getCampaignDays);
router.get('/dashboard', adminCtrl.getDashboard);

module.exports = router;
