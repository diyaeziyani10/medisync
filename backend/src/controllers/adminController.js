const Account = require('../models/Account');
const DoctorProfile = require('../models/DoctorProfile');
const SecretaryProfile = require('../models/SecretaryProfile');
// const PatientProfile = require('../models/PatientProfile'); // On n'en a pas besoin ici !

exports.createStaffAccount = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, specialty, baseFee } = req.body;

    // 1. Sécurité : On vérifie que l'admin n'essaie pas de créer un patient ici (il y a une route pour ça)
    if (!['medecin', 'secretaire'].includes(role)) {
      return res.status(400).json({ message: "Cette route est réservée à la création du personnel médical." });
    }

    // 2. On vérifie que l'email n'est pas déjà pris
    const existingAccount = await Account.findOne({ email });
    if (existingAccount) {
      return res.status(409).json({ message: "Un compte avec cet email existe déjà." });
    }

    // 3. Création du compte (Le mot de passe sera haché automatiquement par Account.js)
    const newAccount = await Account.create({
      email,
      password,
      role
    });

    // 4. Création du profil spécifique
    let profileToReturn;
    
    if (role === 'medecin') {
      profileToReturn = await DoctorProfile.create({
        account: newAccount._id,
        firstName,
        lastName,
        specialty,
        baseFee
      });
    } else if (role === 'secretaire') {
      // NOUVEAU : Création du profil secrétaire
      profileToReturn = await SecretaryProfile.create({
        account: newAccount._id,
        firstName,
        lastName
      });
    }

    res.status(201).json({
      message: `Compte ${role} créé avec succès.`,
      account: {
        id: newAccount._id,
        email: newAccount.email,
        role: newAccount.role
      },
      profile: profileToReturn
    });
    // Si vous avez un SecretaryProfile, vous ajouteriez un "else if (role === 'secretaire')" ici plus tard
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du compte", error: error.message });
  }
};