const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Importation de nos deux vigiles
const auth = require('../middleware/auth'); 

// NOUVEAU : On importe spécifiquement la fonction 'authorize' de votre fichier
const { authorize } = require('../middleware/role'); 
const { protect } = require('../middleware/auth');
// Route : POST /api/admin/create-staff
// On utilise 'authorize' avec le rôle 'administrateur'
router.post('/create-staff', protect, authorize('administrateur'), adminController.createStaffAccount);

module.exports = router;