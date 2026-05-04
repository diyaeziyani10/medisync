const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');
router.post('/', auth.protect, authorize('patient'), appointmentController.createAppointment);
// Seule une 'secretaire' (ou un admin) peut voir le planning complet
router.get('/', auth.protect, authorize('secretaire'), appointmentController.getAllAppointments);
router.patch('/:id/cancel', auth.protect, appointmentController.cancelAppointment);
router.patch('/:id/reschedule', auth.protect, appointmentController.updateAppointment);
router.post('/unavailability', auth.protect, authorize('medecin'), appointmentController.setIndisponibilite);
router.patch('/:id/confirm', auth.protect, authorize('secretaire', 'administrateur'), appointmentController.confirmAppointment);
module.exports = router;