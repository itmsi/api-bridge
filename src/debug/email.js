// const { sendAlert } = require('../utils')
const { mail, APP_INFO } = require('../utils')

const debugEmail = async () => {
  const data = {
    first_name: 'kucing',
    last_name: 'hijau',
    email: 'hijau@hijau.com',
    customer_no: 'asdasd',
    phone: 'asdasd',
    password: 'asd',
    ...APP_INFO
  }
  const attach = [
    {
      filename: 'image.png',
      path: 'public/images/example.png'
    }
  ]
  const a = await mail.init()
    .to('muhammadabdulfalaqnur@gmail.com')
    .subject('Alert Error Job')
    .html('mail/alert_job', { data })
    .attachments(attach)
    .send();

  console.log(a);
}

debugEmail()

// sendAlert({ a: 'test' }).then((r) => {
//   console.log('success sending', r)
// }).catch((error) => {
//   console.log('error sending', error)
// })
