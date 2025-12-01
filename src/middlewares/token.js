const jwtDecode = require('jwt-decode')
const { lang } = require('../lang')
const { ROLE } = require('../utils')

const verifyToken = async (req, res, next) => {
  if (req?.headers?.authorization) {
    const token = req?.headers?.authorization.split(' ')[1]
    const decode = jwtDecode(token)
    if (decode?.roles && decode.roles[0] === ROLE.CUSTOMER_BUYER) {
      res.status(201).send({
        status: false,
        message: lang.__('token.invalid'),
        data: []
      })
    } else {
      // Simpan decoded token ke req.user
      req.user = decode
      next()
    }
  } else {
    res.status(201).send({
      status: false,
      message: lang.__('token.required'),
      data: []
    })
  }
}

const verifyTokenCustomer = async (req, res, next) => {
  const response = (message) => res.status(201).send({
    status: false,
    message,
    data: []
  })
  try {
    if (req?.headers?.authorization) {
      const token = req?.headers?.authorization.split(' ')[1]
      const roles = ['front', 'Customer-Buyer'];
      const decode = jwtDecode(token)
      if (roles.includes(decode?.roles && decode.roles[0])) {
        next()
      } else {
        response(lang.__('token.invalid'))
      }
    } else {
      response(lang.__('token.required'))
    }
  } catch (error) {
    response(error.toString())
  }
}

const verifyTokenClient = async (req, res, next) => {
  const response = (message) => res.status(201).send({
    status: false,
    message,
    data: []
  })
  if (req?.headers?.authorization) {
    const token = req?.headers?.authorization.split(' ')[1]
    const roles = [ROLE.CLIENT_SELLER];
    const decode = jwtDecode(token)
    if (roles.includes(decode?.roles && decode.roles[0])) {
      next()
    } else {
      response(lang.__('token.invalid'))
    }
  } else {
    response(lang.__('token.required'))
  }
}

const verifyTokenAuction = async (req, res, next) => {
  const response = (message) => res.status(201).send({
    status: false,
    message,
    data: []
  })
  if (req?.headers?.authorization) {
    const token = req?.headers?.authorization.split(' ')[1]
    const roles = ROLE.AUCTION
    const decode = jwtDecode(token)
    if (roles.includes(decode?.roles && decode.roles[0])) {
      next()
    } else {
      response(lang.__('token.invalid'))
    }
  } else {
    response(lang.__('token.required'))
  }
}

module.exports = {
  verifyToken,
  verifyTokenCustomer,
  verifyTokenClient,
  verifyTokenAuction
}
