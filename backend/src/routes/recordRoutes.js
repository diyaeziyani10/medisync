const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');

// Seul un 'medecin' peut créer un dossier médical
router.post('/', auth.protect, authorize('medecin'), recordController.addConsultation);

module.exports = router;