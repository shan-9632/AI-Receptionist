// emailNotifications.js
const sgMail = require("@sendgrid/mail");

// Make sure SENDGRID_API_KEY is set in Replit secrets
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function buildEmailText(booking) {
  return `
New booking request received:

Name: ${booking.customerName || "N/A"}
Phone: ${booking.customerPhone || "N/A"}

Job: ${booking.jobType || "N/A"}

Vehicle: ${booking.vehicleYear || ""} ${booking.vehicleMake || ""} ${booking.vehicleModel || ""}
Rego: ${booking.registration || "N/A"}
VIN: ${booking.vin || "N/A"}
Odometer: ${booking.odometer || "N/A"}

Location: ${booking.location || "N/A"}
Urgency: ${booking.urgency || "N/A"}
Preferred Time: ${booking.preferredTime || "N/A"}

Problem Description:
${booking.problemDescription || "N/A"}

—— Sent automatically by your AI Receptionist
`;
}

async function sendBookingEmail(booking) {
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM;

  if (!to || !from) {
    console.error("EMAIL_TO or EMAIL_FROM not set in environment.");
    return;
  }

  const msg = {
    to,
    from,
    subject: "New Booking Request – Sammies Automotive",
    text: buildEmailText(booking),
  };

  try {
    await sgMail.send(msg);
    console.log("Booking email sent successfully.");
  } catch (err) {
    console.error("Error sending booking email:", err.response?.body || err);
  }
}

module.exports = {
  sendBookingEmail,
};
