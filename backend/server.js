require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Importation des routes
const adminRoutes = require('./src/routes/adminRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const authRoutes = require('./src/routes/authRoutes');
const recordRoutes = require('./src/routes/recordRoutes');

connectDB();

const app = express();

// Middlewares globaux
app.use(cors({ origin: 'http://localhost:4200' })); // Autorise le front-end Angular
app.use(express.json()); // Permet au serveur de lire les données JSON envoyées

// Branchement des routes (Noms d'URL propres)
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);

// Middleware global de gestion d'erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server error', error: err.message });
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré en mode développement sur le port ${PORT}`);
});