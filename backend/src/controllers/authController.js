const Account = require('../models/Account');
const PatientProfile = require('../models/PatientProfile');
const jwt = require('jsonwebtoken');

// Outil : Imprime le fameux "bracelet VIP" (Token JWT)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, socialSecurityNumber, password, role, firstName, lastName } = req.body;

    // 1. Validation : L'utilisateur a-t-il fourni au moins un identifiant ?
    const query = [];
    if (email) query.push({ email });
    if (socialSecurityNumber) query.push({ socialSecurityNumber });

    if (query.length === 0) {
      return res.status(400).json({ message: "Veuillez fournir un email ou un numéro de sécurité sociale." });
    }

    // 2. Vérification : Le compte existe-t-il déjà ?
    const userExists = await Account.findOne({ $or: query });
    if (userExists) {
      return res.status(400).json({ message: "Un compte existe déjà avec cet identifiant." });
    }

    // 3. Création du Noyau de Sécurité
    const account = await Account.create({
      email,
      socialSecurityNumber,
      password, // Mongoose va automatiquement le hacher grâce à notre Hook !
      role
    });

    // 4. Création du Profil si c'est un patient
    let profile = null;
    if (role === 'patient') {
      if (!firstName || !lastName) {
        // En cas d'erreur, on supprime le compte qu'on vient de créer pour ne pas laisser de "compte fantôme"
        await Account.findByIdAndDelete(account._id);
        return res.status(400).json({ message: "Le prénom et le nom sont obligatoires pour un patient." });
      }

      profile = await PatientProfile.create({
        account: account._id, // On lie le profil au compte !
        firstName,
        lastName
      });
    }

    // 5. Génération du Token
    const token = generateToken(account._id);

    // 6. Envoi de la réponse de succès
    res.status(201).json({
      message: "Compte créé avec succès",
      token,
      account: { id: account._id, role: account.role },
      profile
    });

  } catch (error) {
    // Si la Regex du mot de passe échoue, l'erreur atterrit ici !
    res.status(400).json({ message: "Erreur de validation", error: error.message });
  }
};