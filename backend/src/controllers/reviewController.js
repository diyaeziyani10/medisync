const Review = require('../models/Review');
const Appointment = require('../models/Appointment');

exports.createReview = async (req, res) => {
  try {
    const { appointmentId, rating, comment, isIssueReport } = req.body;

    // Vérification : le RDV doit être 'terminé' pour être évalué
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment || appointment.status !== 'terminé') {
      return res.status(400).json({ message: "Vous ne pouvez évaluer qu'une consultation terminée." });
    }

    const review = await Review.create({
      appointment: appointmentId,
      patient: appointment.patient,
      doctor: appointment.doctor,
      rating,
      comment,
      isIssueReport // Pour le "Signalement d'un problème"
    });

    res.status(201).json({ message: "Avis enregistré avec succès", review });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'envoi de l'avis", error: error.message });
  }
};