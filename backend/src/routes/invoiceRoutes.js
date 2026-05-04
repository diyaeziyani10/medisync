const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth'); // Ajustez le chemin selon votre structure
const { authorize } = require('../middleware/role');

// Télécharger la facture en PDF (Seule la secrétaire ou l'admin peut le faire)
router.get('/:id/pdf', protect, authorize('secretaire', 'administrateur'), invoiceController.generateInvoicePDF);
// 1. Créer la facture
router.post('/', protect, authorize('secretaire', 'administrateur'), invoiceController.createInvoice);

// 2. Télécharger la facture en PDF
router.get('/:id/pdf', protect, authorize('secretaire', 'administrateur', 'patient'), invoiceController.generateInvoicePDF);

// 3. Envoyer le PDF par email au patient
router.post('/:id/send-email', protect, authorize('secretaire', 'administrateur'), invoiceController.sendInvoiceEmail);
module.exports = router;