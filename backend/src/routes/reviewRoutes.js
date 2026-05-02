const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.post('/', auth.protect, authorize('patient'), reviewController.createReview);

module.exports = router;