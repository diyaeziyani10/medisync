const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Format d\'email invalide']
  },
  socialSecurityNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    // Regex stricte : 8 caractères min, 1 majuscule, 1 chiffre, 1 caractère spécial
    match: [/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial']
  },
  googleId: { 
    type: String // Utilisé plus tard pour la connexion OAuth 2.0
  }, 
  role: {
    type: String,
    enum: ['patient', 'medecin', 'secretaire', 'administrateur'],
    required: true,
  },
  twoFactorSecret: { 
    type: String // Utilisé pour le TOTP (Google Authenticator) de l'administrateur
  },
}, { timestamps: true });

// Middleware : Vérification AVANT la validation
accountSchema.pre('validate', function() {
  // On vérifie qu'au moins l'un des deux identifiants est présent
  if (!this.email && !this.socialSecurityNumber) {
    // Plus de next(), on "jette" directement l'erreur
    throw new Error('Vous devez fournir soit une adresse email, soit un numéro de sécurité sociale pour créer un compte.');
  }
});

// Middleware : Hachage du mot de passe AVANT la sauvegarde
accountSchema.pre('save', async function () {
  // Si le mot de passe n'a pas été modifié, on ne le re-crypte pas
  if (!this.isModified('password')) {
    return; // Plus de next(), un simple return suffit
  }

  // Pas besoin de try/catch, Mongoose gère automatiquement les erreurs dans les fonctions async
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode pour comparer les mots de passe lors de la connexion
accountSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Account', accountSchema);