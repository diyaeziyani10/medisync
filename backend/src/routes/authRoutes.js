const express = require('express');
const router = express.Router();
// On importe nos deux fonctions depuis le contrôleur
const { register, login } = require('../controllers/authController');

// URL finale : POST http://localhost:3000/api/auth/register
router.post('/register', register);

// URL finale : POST http://localhost:3000/api/auth/login
router.post('/login', login);

module.exports = router;