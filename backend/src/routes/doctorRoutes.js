const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');

const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Route ouverte aux patients pour chercher un médecin
// URL finale : GET /api/doctors/search
router.get('/search', auth.protect, authorize('patient', 'secretaire', 'administrateur'), doctorController.searchDoctors);

module.exports = router;