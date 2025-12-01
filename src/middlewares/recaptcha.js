const axios = require('axios');
const { secret, url } = require('../config');
const { lang } = require('../lang');

const validateRecaptcha = async (req, res, next) => {
  const response = (message) => res.status(201).send({
    status: false,
    message,
    data: [],
  });
  try {
    const result = await axios({
      method: 'POST',
      url,
      params: {
        secret,
        response: req?.body?.captcha_key,
      },
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = result?.data || {};

    // if (data?.success) {
    return next();
    // }

    // return response(lang.__('failed.captcha'));
  } catch (error) {
    return response(error.toString());
  }
};

module.exports = {
  validateRecaptcha,
};
