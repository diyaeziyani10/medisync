const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const { sendNotification } = require('../utils/emailService');
// 1. Créer un nouveau rendez-vous (Généralement appelé par un Patient)
exports.createAppointment = async (req, res) => {
  try {
const { doctorId, dependentId, date, time, duration, notes, reason } = req.body;
let targetPatientId;
    if (req.user.role === 'secretaire' || req.user.role === 'administrateur') {
        if (!req.body.patientId) {
            return res.status(400).json({ message: "L'ID du patient est requis pour la secrétaire." });
        }
        targetPatientId = req.body.patientId;
    } else {
        targetPatientId = req.user.id;
    }
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

    // Vérification des conflits (La méthode simple et robuste)
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      status: { $ne: 'annulé' },
      startTime: { $lt: endDateTime }, // Le RDV existant commence AVANT la fin du nouveau
      endTime: { $gt: startDateTime }  // ET le RDV existant se termine APRÈS le début du nouveau
    });

    if (conflict) {
      return res.status(409).json({ message: "Le médecin est déjà occupé sur ce créneau horaire." });
    }
   

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
  );
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
// --- FONCTIONS DE MODIFICATION ET ANNULATION (Point 3.1.4) ---

// 3. Modifier un rendez-vous (Reschedule)
exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time } = req.body;
    
    // Création de la nouvelle date
    const startDateTime = new Date(`${date}T${time}`);
    
    // Mise à jour en base de données
    const appointment = await Appointment.findByIdAndUpdate(
        id, 
        { date: startDateTime, startTime: startDateTime }, 
        { new: true }
    );

    if (!appointment) {
        return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    // Envoi de l'email de notification
    try {
      const { sendNotification } = require('../utils/emailService'); // Vérifiez que le nom du fichier est bien sendEmail ou emailService
      await sendNotification(
        req.user.email, 
        "Modification de votre rendez-vous - MediSync", 
        `Bonjour, votre rendez-vous a été déplacé au ${date} à ${time}.`
      );
    } catch (err) { 
        console.error("Erreur email modification"); 
    }

    res.status(200).json({ message: "Rendez-vous modifié et patient notifié.", appointment });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la modification", error: error.message });
  }
};

// 4. Annuler un rendez-vous (Cancel)
exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // On passe le statut à 'annulé'
    const appointment = await Appointment.findByIdAndUpdate(
        id, 
        { status: 'annulé' }, 
        { new: true }
    ).populate('patient');

    if (!appointment) {
        return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    // Envoi de l'email de notification
    try {
      const { sendNotification } = require('../utils/emailService');
      await sendNotification(
        req.user.email, 
        "Annulation de votre rendez-vous - MediSync", 
        `Bonjour, votre rendez-vous prévu le ${appointment.startTime.toLocaleDateString()} a été annulé.`
      );
    } catch (err) { 
        console.error("Erreur email annulation"); 
    }

    res.status(200).json({ message: "Rendez-vous annulé et patient notifié.", appointment });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'annulation", error: error.message });
  }
};
// Voir l'historique des rendez-vous du patient connecté
exports.getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user.id })
      .populate('doctor', 'firstName lastName specialties')
      .sort({ startTime: -1 }); // Du plus récent au plus ancien

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération de l'historique", error: error.message });
  }
};
// Voir le planning du médecin pour une journée spécifique
exports.getDoctorDailySchedule = async (req, res) => {
  try {
    const { date } = req.query; // Format YYYY-MM-DD
    const doctorId = req.user.id;

    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59Z`);

    // ... dans getDoctorDailySchedule
const schedule = await Appointment.find({
  doctor: doctorId,
  startTime: { $gte: startOfDay, $lte: endOfDay },
  status: { $in: ['confirmé', 'indisponible'] } // On récupère les deux
}).populate('patient', 'firstName lastName');
    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du planning", error: error.message });
  }
};
// Bloquer un créneau (Indisponibilité)
exports.setIndisponibilite = async (req, res) => {
  try {
    const { date, startTime, endTime, reason } = req.body;
    const doctorId = req.user.id;

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    // 1. Vérifier s'il y a déjà des rendez-vous sur ce créneau
    const existingAppointments = await Appointment.findOne({
      doctor: doctorId,
      status: { $in: ['en attente', 'confirmé'] },
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (existingAppointments) {
      return res.status(400).json({ 
        message: "Impossible de bloquer ce créneau : des rendez-vous sont déjà programmés." 
      });
    }

    // 2. Créer le blocage
    const block = await Appointment.create({
      doctor: doctorId,
      patient: null, // Pas de patient pour une indisponibilité
      startTime: start,
      endTime: end,
      status: 'indisponible',
      reason: reason || "Indisponibilité médecin"
    });

    res.status(201).json({ message: "Créneau bloqué avec succès", block });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors du blocage", error: error.message });
  }
};
// 3.2.3 - Confirmer un rendez-vous (Secrétaire)
exports.confirmAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
        req.params.id, 
        { status: 'confirmé' }, 
        { new: true }
    ).populate('patient');

    if (!appointment) {
        return res.status(404).json({ message: "Rendez-vous introuvable." });
    }

    // Optionnel mais recommandé : Envoyer un email de confirmation
    try {
        const { sendNotification } = require('../utils/emailService');
        await sendNotification(
            appointment.patient.email, 
            "Confirmation de votre rendez-vous - MediSync", 
            `Bonjour, la secrétaire a confirmé votre rendez-vous du ${appointment.startTime.toLocaleDateString()}.`
        );
    } catch (err) {
        console.error("Erreur email confirmation", err);
    }

    res.status(200).json({ message: "Rendez-vous confirmé avec succès.", appointment });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la confirmation", error: error.message });
  }
};