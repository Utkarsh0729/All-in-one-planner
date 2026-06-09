import nodemailer from 'nodemailer';

// Create a transporter using environment settings
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('SMTP credentials are not fully configured in .env. Email dispatch is disabled.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465, // true for 465, false for others
    auth: {
      user,
      pass,
    },
  });
};

export const sendDailyReportEmail = async (toEmail, userName, reportDate, reportData) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`[Email Skipped] SMTP not configured. Daily report for ${toEmail} logs to console:`, reportData);
    return false;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"All-in-One Planner" <noreply@planner.com>',
    to: toEmail,
    subject: `Daily Update Report - ${reportDate}`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #121212; color: #e0e0e0; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto; border: 1px solid #333;">
        <h2 style="color: #4f46e5; border-bottom: 2px solid #333; padding-bottom: 10px;">Hello, ${userName}!</h2>
        <p style="font-size: 16px; color: #b3b3b3;">Here is your daily summary updates report for <strong>${reportDate}</strong>:</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #1e1e1e; border-left: 4px solid #10b981; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #10b981;">🍎 Nutrition & Calories</h3>
          <p style="margin: 0; line-height: 1.5;">${reportData.nutrition}</p>
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #1e1e1e; border-left: 4px solid #3b82f6; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #3b82f6;">💪 Gym & Workout</h3>
          <p style="margin: 0; line-height: 1.5;">${reportData.workout}</p>
        </div>

        <div style="margin: 20px 0; padding: 15px; background-color: #1e1e1e; border-left: 4px solid #a855f7; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #a855f7;">📅 Weekly Goals Progress</h3>
          <p style="margin: 0; line-height: 1.5;">${reportData.weeklyGoals}</p>
        </div>

        <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 15px; font-size: 12px; color: #666; text-align: center;">
          <p>You received this update because you are subscribed to daily alerts on the All-in-One Planner.</p>
          <p style="margin: 0;">To opt-out, go to the Website Settings panel.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] Message sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email Error] Failed to send to ${toEmail}:`, error);
    return false;
  }
};
