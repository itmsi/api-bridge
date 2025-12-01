const rateLimit = require('express-rate-limit');
const { lang } = require('../lang');

const rateLimiterConfiguration = {
  windowMs: Number(process.env.RATE_LIMIT_RETRY) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX),
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req, _res) => (req.headers.realip ? req.headers.realip : req.headers['x-forwarded-for']), // IP address from requestIp.mw(), as opposed to req.ip,
  handler: (req, res, _next, _options) => {
    res.status(201).send({
      status: false,
      message: lang.__('failed.rate_limit', { menit: process.env.RATE_LIMIT_RETRY }),
      data: []
    })
  },
};

const adminSigninLimiter = rateLimit({ ...rateLimiterConfiguration });

const customerSigninLimiter = rateLimit({ ...rateLimiterConfiguration });

const clientSigninLimiter = rateLimit({ ...rateLimiterConfiguration });

const conductorSigninLimiter = rateLimit({ ...rateLimiterConfiguration });

const clientForgotPasswordLimiter = rateLimit({ ...rateLimiterConfiguration });

const customerForgotPasswordLimiter = rateLimit({ ...rateLimiterConfiguration });

module.exports = {
  adminSigninLimiter,
  customerSigninLimiter,
  conductorSigninLimiter,
  clientSigninLimiter,
  clientForgotPasswordLimiter,
  customerForgotPasswordLimiter
};
