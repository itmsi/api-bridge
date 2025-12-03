const jwt = require('jsonwebtoken')
const token = require('./token')
const validation = require('./validation')
const recaptcha = require('./recaptcha')
const rateLimiterMiddleware = require('./rate-limiter')
const apiKey = require('./api-key')
const oauth2 = require('./oauth2')

const verifyTokenMember = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    if (!decoded.member_id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      })
    }

    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
}

module.exports = {
  ...token,
  ...validation,
  ...recaptcha,
  ...rateLimiterMiddleware,
  ...apiKey,
  ...oauth2,
  verifyTokenMember
}
