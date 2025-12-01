const whitelist = [
  'http://localhost',
  'https://88c98d580c697d.lhr.life'
]

let allow
if (process.env.NODE_ENV === 'development') {
  allow = '*'
} else {
  allow = function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}

const corsOptions = {
  origin: allow
}

module.exports = { corsOptions }
