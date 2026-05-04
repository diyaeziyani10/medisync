const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email", // Utilisez Ethereal pour vos tests de soutenance
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendNotification = async (to, subject, text) => {
  try {
    await transporter.sendMail({ from: '"MediSync" <noreply@medisync.com>', to, subject, text });
  } catch (error) {
    console.error("Erreur email:", error);
  }
};