const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

router.get('/settings', adminCtrl.getSettings);
router.post('/active-slot', adminCtrl.setActiveSlot);
router.get('/campaign-days', adminCtrl.getCampaignDays);
router.get('/dashboard', adminCtrl.getDashboard);

// Admin-managed campaign location.
router.get('/location', adminCtrl.getLocation);
router.post('/location', adminCtrl.updateLocation);
router.get('/location-history', adminCtrl.getLocationHistory);

// Finalized consent PDF. Reuse your existing admin auth middleware here if backend auth exists.
router.get('/consent-pdf/:userId', adminCtrl.getConsentPdf);

module.exports = router;
