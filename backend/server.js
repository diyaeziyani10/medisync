require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const cron = require('node-cron');
const Appointment = require('./src/models/Appointment');
const emailService = require('./src/utils/emailService');

// Vérifie toutes les heures si des rendez-vous ont lieu dans 24h ou 1h
cron.schedule('0 * * * *', async () => {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const upcoming = await Appointment.find({ 
    startTime: { $gte: now, $lte: in24h },
    status: 'planifié' 
  }).populate('patient doctor');

  // Logique d'envoi ici (simplifiée pour l'exemple)
});// Importation des routes
const adminRoutes = require('./src/routes/adminRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const authRoutes = require('./src/routes/authRoutes');
const recordRoutes = require('./src/routes/recordRoutes');
const doctorRoutes = require('./src/routes/doctorRoutes');
connectDB();
app.use('/api/reviews', reviewRoutes);
const app = express();

// Middlewares globaux
app.use(cors({ origin: 'http://localhost:4200' })); // Autorise le front-end Angular
app.use(express.json()); // Permet au serveur de lire les données JSON envoyées
// Branchement des routes (Noms d'URL propres)
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/doctors', doctorRoutes);
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
