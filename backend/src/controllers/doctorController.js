const DoctorProfile = require('../models/DoctorProfile');

exports.searchDoctors = async (req, res) => {
  try {
    // 1. On récupère les critères de recherche depuis l'URL (query parameters)
    // Exemple d'URL : /api/doctors/search?specialty=Cardiologie&location=Tetouan
    const { specialty, location, language, name } = req.query;

    // 2. On construit l'objet de filtre dynamique
    let query = {};

    if (specialty) {
      // On cherche dans le tableau specialties (insensible à la casse)
      query.specialties = { $regex: new RegExp(specialty, 'i') };
    }
    
    if (location) {
      query.location = { $regex: new RegExp(location, 'i') };
    }
    
    if (language) {
      query.languages = { $regex: new RegExp(language, 'i') };
    }

    if (name) {
      // Si le patient tape un nom, on cherche dans le prénom OU le nom
      query.$or = [
        { firstName: { $regex: new RegExp(name, 'i') } },
        { lastName: { $regex: new RegExp(name, 'i') } }
      ];
    }

    // 3. Exécution de la recherche
    // On peut aussi faire un .populate('account', 'email') si on veut récupérer l'email de connexion
    const doctors = await DoctorProfile.find(query).populate('account', 'email');

    res.status(200).json({
      message: "Recherche effectuée avec succès",
      count: doctors.length,
      doctors
    });

  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la recherche", error: error.message });
  }
};