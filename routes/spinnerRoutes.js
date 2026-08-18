const express = require('express');
const router = express.Router();
const spinnerCtrl = require('../controllers/spinnerController');

router.post('/start', spinnerCtrl.startSpin);
router.post('/save', spinnerCtrl.saveSpinnerResult);
router.post('/reject', spinnerCtrl.rejectSpinner);

module.exports = router;
