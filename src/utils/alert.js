const axios = require('axios');
const mail = require('./mail')
const { APP_INFO } = require('./constant')

const sendAlert = async (rows) => {
  const data = {
    ...rows,
    ...APP_INFO
  }

  let template = 'mail/alert_job'
  let subject = `Alert Error Job ${process.env.APP_NAME} || ${process.env.NODE_ENV} ${process.env.APP_ENV}`

  if (rows?.alert_type === 'exception') {
    template = 'mail/exception'
    subject = `Alert Exception ${process.env.APP_NAME} || ${process.env.NODE_ENV} ${process.env.APP_ENV}`
  } else if (rows?.alert_type === 'exception-url') {
    template = 'mail/url'
    subject = `Alert Exception ${process.env.APP_NAME} || ${process.env.NODE_ENV} ${process.env.APP_ENV}`
  }
  const status = await mail.init()
    .to(process.env.MAIL_ALERT_LIST.split(','))
    .subject(subject)
    .html(template, { data })
    .send()

  return status
}

const sendAlertSlack = async (rows) => {
  const data = {
    ...rows,
    ...APP_INFO
  };
  return 'captured-not-sent-to-slack';//sementara di hide dulu
  try {
    if (process.env.SLACK_CAPTURE === 'on') {
      const text = `*Alert Exception*\n${process.env.APP_NAME}\n*Environment*\n${
        process.env.NODE_ENV
      }\n*Message*\n${data?.messages}\n*Errors*\n${
        data?.exceptions
      }\n*Exceptions*\n${JSON.stringify(data?.errors)}\n*Path*\n${
        data?.path_error
      }`;
      await axios({
        method: 'POST',
        url: `${process.env.SLACK_API}/chat.postMessage`,
        data: { text, channel: `#${process.env.SLACK_CHANNEL}` },
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          accept: 'json',
          Authorization: `Bearer ${process.env.SLACK_KEY}`
        }
      });
      return 'captured';
    }
    console.log('not sending to slack')
    return 'captured-not-sent-to-slack';
  } catch (errs) {
    console.info(errs);
    return 'not-captured';
  }
};

module.exports = {
  sendAlert,
  sendAlertSlack
}
