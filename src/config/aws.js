require('dotenv').config();

// Check if AWS is enabled
const isAwsEnabled = process.env.AWS_ENABLED === 'true'

// Initialize AWS S3 only if enabled
let awsBucket = null; let
  awsBucketPrivate = null;

if (isAwsEnabled) {
  // eslint-disable-next-line global-require
  const AWS = require('aws-sdk');

  // Initializing S3 Interface
  awsBucket = new AWS.S3({
    accessKeyId: process.env.AWS_BUCKET_KEY_ID,
    secretAccessKey: process.env.AWS_BUCKET_KEY,
    region: process.env.BUCKET_REGION
  })

  awsBucketPrivate = new AWS.S3({
    accessKeyId: process.env.AWS_BUCKET_KEY_ID_PRIVATE,
    secretAccessKey: process.env.AWS_BUCKET_KEY_PRIVATE,
    region: process.env.BUCKET_REGION
  })
}

const getSingedUrl = async (isPrivate, Key, expiry = 5 * 30 * 24 * 60 * 60) => {
  // If AWS is disabled, return empty string
  if (!isAwsEnabled) {
    console.log('AWS is disabled, returning empty signed URL')
    return ''
  }

  let { Bucket, method } = ['', '']
  if (isPrivate) {
    Bucket = process.env.AWS_BUCKET_PRIVATE
    method = awsBucket
  } else {
    Bucket = process.env.AWS_BUCKET
    method = awsBucketPrivate
  }
  const params = { Bucket, Key, Expires: expiry }
  try {
    const url = await new Promise((resolve, reject) => {
      method.getSignedUrl('getObject', params, (err, row) => (err ? reject(err) : resolve(row)))
    })
    return url
  } catch (err) {
    console.log(err)
    return ''
  }
}

module.exports = {
  awsBucket,
  getSingedUrl,
  awsBucketPrivate,
  isAwsEnabled
}
