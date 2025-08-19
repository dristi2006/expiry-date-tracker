const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use STARTTLS (TLS) not SSL
  auth: {
    user: "dristisalterego@gmail.com",
    pass: "fqpd ngdr igmb vukm"
  },
  tls: {
    rejectUnauthorized: false
  }
});

module.exports = async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: "dristisalterego@gmail.com",
    to,
    subject,
    text,
  });
};
