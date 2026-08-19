const express = require('express');
const router = express.Router();
const claimCtrl = require('../controllers/claimController');

router.post('/register', claimCtrl.registerClaim);
router.post('/decline', claimCtrl.declineClaim);
router.get('/:token', claimCtrl.getClaim);
router.post('/:token/accept', claimCtrl.acceptClaim);
router.post('/:token/decline', claimCtrl.declineClaimLink);

module.exports = router;
