const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');
router.post('/', auth.protect, authorize('patient'), appointmentController.createAppointment);
// Seule une 'secretaire' (ou un admin) peut voir le planning complet
router.get('/', auth.protect, authorize('secretaire'), appointmentController.getAllAppointments);

module.exports = router;