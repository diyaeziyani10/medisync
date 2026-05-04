const nodemailer = require('nodemailer');

// Nouvelle configuration pour Gmail avec OAuth 2.0
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
    }
});

// On ajoute 'attachment = null' pour rendre la pièce jointe optionnelle
exports.sendNotification = async (to, subject, text, attachment = null) => {
    try {
        // 1. On prépare les options de base de l'e-mail
        const mailOptions = {
            from: `"Clinique MediSync" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            text: text
        };

        // 2. Si une pièce jointe est fournie (comme notre PDF), on l'ajoute aux options
        if (attachment) {
            mailOptions.attachments = [attachment];
        }

        // 3. On envoie l'e-mail avec les options finales
        await transporter.sendMail(mailOptions);
        
        console.log("✅ VRAI Email envoyé avec succès via Gmail OAuth2 à :", to);
    } catch (error) {
        console.error("❌ Erreur lors de l'envoi de l'email :");
        console.error(error);
    }
};