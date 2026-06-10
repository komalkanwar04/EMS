const nodemailer = require("nodemailer");
const pool = require("../db");

/**
 * Send an email using database SMTP settings, or fallback to server console simulation if SMTP is disabled.
 * @param {Object} mailOptions
 * @param {string} mailOptions.to - Recipient email address
 * @param {string} mailOptions.subject - Subject line
 * @param {string} mailOptions.text - Plain text content
 * @param {string} [mailOptions.html] - HTML content
 * @returns {Promise<{success: boolean, messageId?: string, simulated?: boolean}>}
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    // 1. Fetch current SMTP settings from database
    const smtpRes = await pool.query("SELECT * FROM smtp_settings WHERE id = 1");
    const settings = smtpRes.rows[0];

    if (settings && settings.is_enabled) {
      if (!settings.host || !settings.username) {
        throw new Error("SMTP host or username is not configured in settings.");
      }

      // 2. Create nodemailer transporter using the dynamically loaded settings
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: Number(settings.port) || 587,
        secure: settings.secure === true || settings.secure === "true", // true for port 465, false for 587/other
        auth: {
          user: settings.username,
          pass: settings.password || "",
        },
        connectionTimeout: 10000, // 10s timeout to prevent hanging connections
      });

      // 3. Prepare email details
      const mailDetails = {
        from: settings.from_email || settings.username,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, "<br>"),
      };

      // 4. Send email
      const info = await transporter.sendMail(mailDetails);
      console.log(`[SMTP EMAIL SENT] Message ID: ${info.messageId} successfully delivered to ${to}`);
      return { success: true, messageId: info.messageId };
    } else {
      // SMTP is disabled, fall back to console log simulation
      console.log(`
============================================================
[SIMULATED EMAIL - SMTP DISABLED]
To: ${to}
Subject: ${subject}
Text:
${text}
============================================================
      `);
      return { success: true, simulated: true };
    }
  } catch (error) {
    console.error("[Email Dispatch Failure]", error);
    // Re-throw so callers can receive the connection/auth error details
    throw error;
  }
};

module.exports = { sendEmail };
