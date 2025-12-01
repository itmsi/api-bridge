module.exports = {
  development: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USERNAME, // generated ethereal user
      pass: process.env.MAIL_PASSWORD, // generated ethereal password
    },
    sender: process.env.MAIL_FROM,
    secureConnection: process?.env?.MAIL_ENCRYPTION ?? true,
    ignoreTLS: process?.env?.IGNORE_TLS ?? false
  },
  production: {
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USERNAME, // generated ethereal user
      pass: process.env.MAIL_PASSWORD, // generated ethereal password
    },
    sender: process.env.MAIL_FROM,
    tls: {
      rejectUnauthorized: false
    }
  }
}
