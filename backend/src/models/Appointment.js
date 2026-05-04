const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // 1. Les Acteurs du rendez-vous
  patient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PatientProfile', 
    required: true 
  },
  doctor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'DoctorProfile', 
    required: true 
  },
  
  // 2. Gestion du Tiers (Enfant mineur, personne dépendante)
  // Si ce champ est rempli, cela signifie que le RDV n'est pas pour le patient principal
  // mais pour l'un de ses proches (qui est stocké dans le tableau "dependents" de son profil)
  dependentId: { 
    type: mongoose.Schema.Types.ObjectId 
  }, 
  
  // 3. Date et Temps
  startTime: { 
    type: Date, 
    required: true 
  },
  // Contrainte stricte du cahier des charges : 15, 30 ou 60 minutes
  duration: { 
    type: Number, 
    enum: [15, 30, 60], 
    required: true 
  }, 
  
  // 4. Motif et Statut
  reason: { 
    type: String, 
    enum: ['consultation générale', 'suivi', 'urgence', 'autre'], 
    required: true 
  },
  status: {
    type: String,
    enum: ['planifié', 'terminé', 'annulé', 'no-show'],
    default: 'planifié'
  }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);