const getContactUsEmailTemplate = (data) => {
  const {
    contact_us_user_name_first,
    contact_us_user_name_last,
    contact_us_user_subject,
    contact_us_user_email,
    contact_us_user_message
  } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>New Contact Us Message</h2>
        </div>
        <div class="content">
          <p><strong>Name:</strong> ${contact_us_user_name_first} ${contact_us_user_name_last}</p>
          <p><strong>Email:</strong> ${contact_us_user_email}</p>
          <p><strong>Subject:</strong> ${contact_us_user_subject}</p>
          <p><strong>Message:</strong></p>
          <p>${contact_us_user_message}</p>
        </div>
        <div class="footer">
          <p>This is an automated message from your contact form.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  getContactUsEmailTemplate
};
