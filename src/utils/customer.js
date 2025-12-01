const { pgCore } = require('../config/database')
const { todayFormat } = require('./date')

/**
 * Generate a unique customer number
 * Format: CUS-YYYYMMDD-XXXXX
 * Where XXXXX is a sequential number padded with zeros
 * @returns {Promise<string>} The generated customer number
 */
const generateCustomerNo = async () => {
  try {
    const today = todayFormat('YYYYMMDD')
    const prefix = 'CUS'

    // Get the last customer number for today
    const lastCustomer = await pgCore('mst_customer')
      .where('customer_no', 'like', `${prefix}-${today}-%`)
      .orderBy('customer_no', 'desc')
      .first()

    let sequence = 1
    if (lastCustomer) {
      // Extract the sequence number from the last customer number
      const lastSequence = parseInt(lastCustomer.customer_no.split('-')[2], 10)
      sequence = lastSequence + 1
    }

    // Format the sequence number with leading zeros
    const paddedSequence = sequence.toString().padStart(5, '0')

    // Generate the new customer number
    return `${prefix}-${today}-${paddedSequence}`
  } catch (error) {
    console.error('Error generating customer number:', error)
    throw error
  }
}

module.exports = {
  generateCustomerNo
}
