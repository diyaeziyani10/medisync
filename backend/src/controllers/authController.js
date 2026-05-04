const Account = require('../models/Account');
const PatientProfile = require('../models/PatientProfile');
const jwt = require('jsonwebtoken');

// Outil interne : Génère le "bracelet VIP" (Token JWT) valide pour 1 jour
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
};

// ==========================================
// ROUTE 1 : INSCRIPTION (POST /api/auth/register)
// ==========================================
exports.register = async (req, res) => {
  try {
    // 1. Extraction des données envoyées par Thunder Client ou Angular
    const { email, socialSecurityNumber, password, role, firstName, lastName } = req.body;

    // 2. Règle métier : On exige soit l'email, soit le numéro de sécu
    if (!email && !socialSecurityNumber) {
      return res.status(400).json({ message: "Veuillez fournir un email ou un numéro de sécurité sociale." });
    }

    // 3. Vérification : Le compte existe-t-il déjà ?
    const query = [];
    if (email) query.push({ email });
    if (socialSecurityNumber) query.push({ socialSecurityNumber });

    const userExists = await Account.findOne({ $or: query });
    if (userExists) {
      return res.status(400).json({ message: "Un compte existe déjà avec cet identifiant." });
    }

    // 4. Création du compte dans la base de données
    // (Le Hook Mongoose dans Account.js va automatiquement hacher le mot de passe ici !)
    const account = await Account.create({
      email,
      socialSecurityNumber,
      password,
      role
    });

    // 5. Création du profil patient si le rôle est "patient"
    let profile = null;
    if (role === 'patient') {
      // Si le front-end a oublié d'envoyer le prénom et le nom, on annule tout !
      if (!firstName || !lastName) {
        await Account.findByIdAndDelete(account._id); // Nettoyage
        return res.status(400).json({ message: "Le prénom et le nom sont obligatoires pour un patient." });
      }

      // On crée le profil en le liant fermement à l'Account
      profile = await PatientProfile.create({
        account: account._id,
        firstName,
        lastName
      });
    }

    // 6. Génération du Token
    const token = generateToken(account._id);

    // 7. Envoi de la réponse de succès au Front-End
    res.status(201).json({
      message: "Compte créé avec succès",
      token,
      account: { id: account._id, role: account.role },
      profile // Contient les infos du patient
    });

  } catch (error) {
    // Si la Regex du mot de passe (8 car, 1 maj, etc.) n'est pas respectée, l'erreur tombe ici
    res.status(400).json({ message: "Erreur de validation", details: error.message });
  }
};

// ==========================================
// ROUTE 2 : CONNEXION (POST /api/auth/login)
// ==========================================
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // 'identifier' peut être email ou numéro de sécu

    if (!identifier || !password) {
      return res.status(400).json({ message: "Veuillez fournir un identifiant et un mot de passe." });
    }

    // 1. On cherche l'utilisateur par Email OU Numéro de Sécurité Sociale
    const account = await Account.findOne({
      $or: [{ email: identifier }, { socialSecurityNumber: identifier }]
    });

    if (!account) {
      return res.status(401).json({ message: "Identifiants incorrects." }); // On reste vague pour la sécurité
    }

    // 2. On compare le mot de passe tapé avec celui haché en BDD (Méthode créée dans Account.js)
    const isMatch = await account.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Identifiants incorrects." });
    }

    // 3. Tout est bon, on donne le Token !
    const token = generateToken(account._id);

    res.status(200).json({
      message: "Connexion réussie",
      token,
      account: { id: account._id, role: account.role }
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
