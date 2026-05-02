const MedicalRecord = require('../models/MedicalRecord');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');

exports.addConsultation = async (req, res) => {
  try {
    // Notez qu'on utilise "report" et "prescriptions" pour coller à votre modèle
    const { patientId, appointmentId, report, prescriptions } = req.body;

    // 1. Identifier le médecin signataire
    const doctorProfile = await DoctorProfile.findOne({ account: req.user.id });
    if (!doctorProfile) {
      return res.status(404).json({ message: "Profil médecin introuvable." });
    }

    // 2. Préparer l'objet de la nouvelle consultation
    const newConsultation = {
      appointmentId,
      doctorId: doctorProfile._id,
      report,
      prescriptions // Tableau contenant [{ medication, dosage, duration }]
    };

    // 3. Chercher le dossier existant du patient
    let record = await MedicalRecord.findOne({ patient: patientId });

    if (record) {
      // Le patient a déjà un dossier, on ajoute juste la consultation
      record.consultations.push(newConsultation);
      await record.save(); // On sauvegarde les modifications
    } else {
      // C'est le premier rendez-vous du patient, on initialise son dossier central
      record = await MedicalRecord.create({
        patient: patientId,
        consultations: [newConsultation]
        // history et allergies pourront être remplis plus tard par une autre route
      });
    }

    // 4. Mettre à jour le statut du RDV (Optionnel mais recommandé)
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'Terminé' });
    }

    res.status(200).json({
      message: "La consultation a été ajoutée avec succès au dossier médical.",
      record
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de l'ajout au dossier", error: error.message });
  }
};