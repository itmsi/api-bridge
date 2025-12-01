const nodemailer = require('nodemailer');
const { Edge } = require('edge.js')

const path = require('path');
// const { queue } = require('./queue');
const config = require('../config/mail');
const { logger } = require('./logger')

class Mail {
  constructor() {
    this.v_from = config[process.env.NODE_ENV]?.sender;
    this.v_attachments = '';
    this.v_to = '';
    this.v_cc = '';
    this.v_subject = '';
    this.v_html = '';
    this.v_text = '';
    this.v_additional = {};
    this.channel = '';
    this.transporter = nodemailer.createTransport(config[process.env.NODE_ENV]);
    this.edge = new Edge({ cache: false })
  }

  static init() {
    return new this();
  }

  from(from) {
    this.v_from = from;
    return this
  }

  to(to) {
    this.v_to = to;
    return this;
  }

  attachments(attachments) {
    this.v_attachments = attachments;
    return this;
  }

  cc(cc) {
    this.v_cc = cc;
    return this;
  }

  subject(subject) {
    this.v_subject = subject;
    return this
  }

  config(conf) {
    this.transporter = nodemailer.createTransport(conf);
    return this;
  }

  html(view, variable = {}) {
    this.v_html = async (channel = false) => {
      if (channel) {
        return { view, variable }
      }
      this.edge.mount(path.join(__dirname, '../views'))
      let html = view;
      try {
        html = await this.edge.render(view, variable)
      } catch (e) { console.log(e) }
      return html;
    };

    return this;
  }

  text(text) {
    this.v_text = text;
    return this
  }

  additional(opt = {}) {
    this.v_additional = opt;
    return this
  }

  async send() {
    let html;
    try {
      html = await this.v_html(this.channel);
    } catch (e) {
      html = '';
    }

    const option = {
      from: this.v_from,
      to: this.v_to,
      cc: this.v_cc,
      subject: this.v_subject,
      text: this.v_text,
      attachments: this.v_attachments,
      html,
      ...this.v_additional
    };

    if (this.channel) {
      option.config = config;
      // queue(this.channel, option)
      return {
        status: true,
        queue: true,
        channel: this.channel,
        data: option
      }
    }

    try {
      const info = await this.transporter.sendMail(option);
      logger(`${option.subject.toLowerCase().replaceAll(' ', '')}.txt`, 'mail').write(`[SENT] Subject: ${option.subject}, Recipient: "${option.to}".\n`)
      return { status: true, data: info }
    } catch (err) {
      console.log(err)
      logger(`${option.subject.toLowerCase().replaceAll(' ', '')}.txt`, 'mail').write(`[FAILED] Subject: ${option.subject}, Recipient: "${option.to}", Message: ${err.message}.\n`)
      return { status: false, message: err.message, data: {} };
    }
  }

  // queue(channel) {
  //   this.channel = channel;
  //   return this;
  // }
}

module.exports = Mail;
