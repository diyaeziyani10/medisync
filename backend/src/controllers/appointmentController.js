const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
// Créer un nouveau rendez-vous (Généralement appelé par un Patient)
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, duration, notes } = req.body;

    // 1. Validation de la durée stricte selon le cahier des charges (15, 30 ou 60 min)
    const validDurations = [15, 30, 60];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({ 
        message: "Durée invalide. Les consultations doivent durer 15, 30 ou 60 minutes." 
      });
    }

    // 2. Identification du patient via son Token JWT
    // (On suppose que le middleware d'auth a injecté req.user)
    const patientAccountId = req.user.id; 

    // On cherche le profil "patient" lié à ce compte
      const patientProfile = await PatientProfile.findOne({ account: patientAccountId });    
      if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable pour ce compte." });
    }

    // 3. Calcul de l'heure de fin du rendez-vous
    // On transforme la date et l'heure en objet Date compréhensible par JavaScript
    const startDateTime = new Date(`${date}T${time}`);
    
    // On calcule l'heure de fin en ajoutant la durée (en minutes)
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // 4. LE GRAND DÉFI : Vérification des conflits d'agenda
    // On demande à MongoDB : "Y a-t-il déjà un rendez-vous pour ce médecin..."
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      status: { $ne: 'annulé' }, // On ignore les rendez-vous annulés
      $or: [
        // Cas A : Le nouveau RDV commence PENDANT un RDV existant
        { startTime: { $lte: startDateTime }, endTime: { $gt: startDateTime } },
        // Cas B : Le nouveau RDV se termine PENDANT un RDV existant
        { startTime: { $lt: endDateTime }, endTime: { $gte: endDateTime } },
        // Cas C : Le nouveau RDV ENGLOBE totalement un RDV existant
        { startTime: { $gte: startDateTime }, endTime: { $lte: endDateTime } }
      ]
    });

    if (conflict) {
      return res.status(409).json({ message: "Le médecin est déjà occupé sur ce créneau horaire." });
    }

    // 5. Sauvegarde dans la base de données
    const newAppointment = await Appointment.create({
      patient: patientProfile._id,
      doctor: doctorId,
      date: startDateTime, // On peut sauvegarder la date seule si besoin
      startTime: startDateTime,
      endTime: endDateTime,
      duration: duration,
      notes: notes,
      status: 'planifié'
    });

    // 6. Réponse de succès
    res.status(201).json({
      message: "Rendez-vous créé avec succès",
      appointment: newAppointment
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du rendez-vous", error: error.message });
  }
};