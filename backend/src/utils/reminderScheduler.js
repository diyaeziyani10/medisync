const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { sendNotification } = require('./emailService');

// Cette tâche s'exécute TOUTES LES MINUTES
cron.schedule('* * * * *', async () => {
    const now = new Date();
    
    // 1. Rappel 24h avant
    const target24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const windowStart24h = new Date(target24h.getTime() - 30 * 1000); // Fenêtre de 1 min
    const windowEnd24h = new Date(target24h.getTime() + 30 * 1000);

    const appointments24h = await Appointment.find({
        startTime: { $gte: windowStart24h, $lte: windowEnd24h },
        status: 'confirmé'
    }).populate('patient');

    appointments24h.forEach(app => {
        sendNotification(app.patient.email, "Rappel : Votre RDV MediSync dans 24h", `Bonjour, n'oubliez pas votre RDV demain à ${app.startTime.toLocaleTimeString()}.`);
    });

    // 2. Rappel 1h avant
    const target1h = new Date(now.getTime() + 60 * 60 * 1000);
    const windowStart1h = new Date(target1h.getTime() - 30 * 1000);
    const windowEnd1h = new Date(target1h.getTime() + 30 * 1000);

    const appointments1h = await Appointment.find({
        startTime: { $gte: windowStart1h, $lte: windowEnd1h },
        status: 'confirmé'
    }).populate('patient');

    appointments1h.forEach(app => {
        sendNotification(app.patient.email, "Rappel imminent : Votre RDV dans 1 heure", `Bonjour, votre RDV commence dans une heure à ${app.startTime.toLocaleTimeString()}.`);
    });
});