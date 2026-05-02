const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const { sendNotification } = require('../utils/sendEmail');
// 1. Créer un nouveau rendez-vous (Généralement appelé par un Patient)
exports.createAppointment = async (req, res) => {
  try {
const { doctorId, dependentId, date, time, duration, notes, reason } = req.body;
    const validDurations = [15, 30, 60];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({ 
        message: "Durée invalide. Les consultations doivent durer 15, 30 ou 60 minutes." 
      });
    }

    const patientAccountId = req.user.id; 

    const patientProfile = await PatientProfile.findOne({ account: patientAccountId });    
    if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable pour ce compte." });
    }

    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    const conflict = await Appointment.findOne({
      doctor: doctorId,
      status: { $ne: 'annulé' },
      $or: [
        { startTime: { $lte: startDateTime }, endTime: { $gt: startDateTime } },
        { startTime: { $lt: endDateTime }, endTime: { $gte: endDateTime } },
        { startTime: { $gte: startDateTime }, endTime: { $lte: endDateTime } }
      ]
    });

    if (conflict) {
      return res.status(409).json({ message: "Le médecin est déjà occupé sur ce créneau horaire." });
    }
    const { sendNotification } = require('../utils/sendEmail');

    const newAppointment = await Appointment.create({
      patient: patientProfile._id,
      doctor: doctorId,
      dependentId: dependentId,
      date: startDateTime,
      startTime: startDateTime,
      endTime: endDateTime,
      duration: duration,
      notes: notes,
      status: 'planifié',
      reason: reason
    });

    try {
        await sendNotification(
            req.user.email, 
            "Confirmation de votre rendez-vous - MediSync", 
            `Bonjour, votre rendez-vous du ${date} à ${time} est confirmé.`
  );co
    } catch (emailErr) {
       console.error("L'email n'a pas pu être envoyé, mais le RDV est créé.");
}

    res.status(201).json({
      message: "Rendez-vous créé avec succès",
      appointment: newAppointment
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du rendez-vous", error: error.message });
  }
};

// --- NOUVELLE FONCTION POUR LA SECRÉTAIRE ---

// 2. Fonction réservée au personnel administratif (Secrétaire / Admin)
exports.getAllAppointments = async (req, res) => {
  try {
    // Le .find() vide récupère TOUS les documents de la collection appointments
    const appointments = await Appointment.find();

    res.status(200).json({
      message: "Planning récupéré avec succès",
      total: appointments.length,
      appointments
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du planning", error: error.message });
  }
};