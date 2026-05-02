const MedicalRecord = require('../models/MedicalRecord');
const DoctorProfile = require('../models/DoctorProfile');
const Appointment = require('../models/Appointment');
const PatientProfile = require('../models/PatientProfile');
const PDFDocument = require('pdfkit');
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
// Ajoutez cette nouvelle fonction à la fin de recordController.js

exports.uploadDocument = async (req, res) => {
  try {
    // 1. On vérifie si un fichier a bien été envoyé
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier n'a été fourni." });
    }

    // 2. On récupère le dossier médical du patient
    // Si la requête vient du patient lui-même, on cherche son profil
    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    if (!patientProfile) {
       return res.status(404).json({ message: "Profil patient introuvable." });
    }

    let record = await MedicalRecord.findOne({ patient: patientProfile._id });

    // Si le patient n'a pas encore de dossier (car jamais consulté), on en crée un vide
    if (!record) {
      record = await MedicalRecord.create({
        patient: patientProfile._id,
        attachments: []
      });
    }

    // 3. On prépare l'objet document selon le format de notre MedicalRecord.js
    const newAttachment = {
      fileUrl: req.file.path, // Le chemin où Multer a sauvegardé le fichier (ex: 'uploads/123-radio.dcm')
      fileName: req.file.originalname,
      // On extrait l'extension en majuscules sans le point (ex: '.pdf' devient 'PDF')
      fileType: req.file.originalname.split('.').pop().toUpperCase(), 
      uploadedBy: req.user.id 
    };

    // 4. On ajoute le document au tableau attachments
    record.attachments.push(newAttachment);
    await record.save();

    res.status(201).json({
      message: "Document ajouté avec succès au dossier médical.",
      attachment: newAttachment
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors du téléversement", error: error.message });
  }
};
exports.getMyRecord = async (req, res) => {
  try {
    // On trouve le profil patient relié au compte connecté
    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    if (!patientProfile) {
      return res.status(404).json({ message: "Profil patient introuvable." });
    }

    // On cherche son dossier médical
    // Le '.populate' permet de remplacer l'ID du docteur par son vrai nom et sa spécialité pour un bel affichage côté front-end
    const record = await MedicalRecord.findOne({ patient: patientProfile._id })
      .populate('consultations.doctorId', 'firstName lastName specialties');

    if (!record) {
      return res.status(404).json({ message: "Aucun dossier médical trouvé. Vous n'avez pas encore consulté." });
    }

    res.status(200).json({
      message: "Dossier médical récupéré avec succès",
      record
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération du dossier", error: error.message });
  }
};

// =========================================================
// 2. Générer et télécharger le PDF d'une ordonnance
// =========================================================
exports.generatePrescriptionPDF = async (req, res) => {
  try {
    const { consultationId } = req.params; // On récupère l'ID de la consultation dans l'URL

    const patientProfile = await PatientProfile.findOne({ account: req.user.id });
    const record = await MedicalRecord.findOne({ patient: patientProfile._id })
      .populate('consultations.doctorId');

    if (!record) return res.status(404).json({ message: "Dossier introuvable." });

    // On isole la consultation spécifique grâce à son ID
    const consultation = record.consultations.id(consultationId);
    
    if (!consultation || !consultation.prescriptions || consultation.prescriptions.length === 0) {
      return res.status(404).json({ message: "Aucune prescription trouvée pour cette consultation." });
    }

    // --- CRÉATION DU PDF ---
    const doc = new PDFDocument({ margin: 50 });

    // On dit au navigateur web que ce qu'on lui envoie est un fichier PDF à télécharger
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ordonnance-${consultationId}.pdf`);
    
    // On branche le document PDF directement sur la réponse HTTP
    doc.pipe(res);

    // En-tête de l'ordonnance
    doc.fontSize(20).font('Helvetica-Bold').text('CLINIQUE MEDISYNC', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Médecin : Dr. ${consultation.doctorId.firstName} ${consultation.doctorId.lastName}`);
    doc.text(`Spécialité : ${consultation.doctorId.specialties.join(', ')}`);
    doc.moveDown();
    
    // Informations patient et date
    doc.text(`Patient : ${patientProfile.firstName} ${patientProfile.lastName}`, { align: 'right' });
    doc.text(`Date : ${new Date(consultation.date).toLocaleDateString('fr-FR')}`, { align: 'right' });
    doc.moveDown(2);

    // Titre de la section
    doc.fontSize(16).font('Helvetica-Bold').text('PRESCRIPTION MÉDICALE', { underline: true });
    doc.moveDown();

    // Boucle sur les médicaments
    doc.fontSize(12).font('Helvetica');
    consultation.prescriptions.forEach((item, index) => {
      doc.font('Helvetica-Bold').text(`${index + 1}. ${item.medication}`);
      doc.font('Helvetica').text(`   Posologie : ${item.dosage}`);
      doc.text(`   Durée : ${item.duration}`);
      doc.moveDown();
    });

    // Pied de page
    doc.moveDown(3);
    doc.text('Signature du médecin :', { align: 'right' });

    // On termine le document (ça déclenche l'envoi au client)
    doc.end();

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la génération du PDF", error: error.message });
  }
};