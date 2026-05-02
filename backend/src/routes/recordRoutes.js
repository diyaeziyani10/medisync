const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');

const auth = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const upload = require('../middleware/upload');
// Seul un 'medecin' peut créer un dossier médical
router.post('/', auth.protect, authorize('medecin'), recordController.addConsultation);
router.post('/upload', auth.protect, authorize('patient'), upload.single('document'), recordController.uploadDocument);
router.get('/my-record', auth.protect, authorize('patient'), recordController.getMyRecord);
router.get('/my-record/consultations/:consultationId/prescription/pdf', auth.protect, authorize('patient'), recordController.generatePrescriptionPDF);
module.exports = router;