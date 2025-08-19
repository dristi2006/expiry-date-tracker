const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "dristisalterego@gmail.com",
    pass: "fqpd ngdr igmb vukm"
  }
});

transporter.sendMail({
  from: "dristisalterego@gmail.com",
  to: "dristisalterego@gmail.com",
  subject: "Nodemailer Test",
  text: "If you get this, SMTP works!"
}, (err, info) => {
  if (err) {
    console.error("Nodemailer test error:", err);
  } else {
    console.log("Nodemailer test sent:", info.response);
  }
});
