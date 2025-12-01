const path = require('path')
const fs = require('fs')
const { awsBucket, awsBucketPrivate, isAwsEnabled } = require('../config')
const { generateFolder, generateFolderWithSlash } = require('./folder')
const { logger } = require('./logger')
const { logDateFormat } = require('./date')
const { addWatermark } = require('./custom')
const resizeImage = require('./image')

const generateUpload = async (req, num, paths, naming, defaults = '', additional = {
  isWatermark: false, isPrivate: false, isContentType: false, fileNames: '', compressImage: false
}) => {
  const filePath = `user-upload-${logDateFormat()}.txt`
  try {
    // If AWS is disabled, return default values
    if (!isAwsEnabled) {
      console.log('AWS is disabled, returning default values for upload')
      return {
        pathForDatabase: defaults,
        fileNames: defaults,
        status: false
      }
    }

    let { buffer } = req.files[num]
    const mime = req?.files[num]?.mimetype
    let fileNames = req?.files[num]?.fieldname ? `${naming !== '' ? `${naming}-` : ''}${Date.now()}${path.extname(req?.files[num]?.originalname)}` : defaults
    const ACL = additional.isPrivate ? { ACL: 'authenticated-read' } : { ACL: 'public-read' };
    const method = additional.isPrivate ? awsBucketPrivate : awsBucket
    const ContentType = additional.isContentType ? { ContentType: mime } : {};

    let watermarkImage;
    if (additional.isWatermark) {
      const pathWatermarked = path.join(__dirname, `../../storages/tmp/${fileNames}`);
      watermarkImage = await addWatermark(buffer, pathWatermarked);
      buffer = fs.readFileSync(watermarkImage)
      fileNames = additional.fileNames ? `watermark-${additional.fileNames}` : `watermark-${fileNames}`;
    }
    const bucket = additional.isPrivate ? `${process.env.AWS_BUCKET_PRIVATE}/${paths}` : `${process.env.AWS_BUCKET}/${paths}`
    const { pathForDatabase } = generateFolder(bucket)

    if (additional.compressImage) {
      buffer = await resizeImage(buffer, mime, naming)
    }

    const params = {
      Bucket: pathForDatabase,
      Key: fileNames,
      Body: buffer,
      ...ContentType,
      ...ACL,
    };

    // Uploading files to the bucket
    const bucketPath = new Promise((resolve) => {
      method.upload(params, (errs, data) => {
        if (errs) {
          console.error('error aws', errs)
          logger(filePath, 'upload').write(`Error uploading file ${fileNames} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
        }
        resolve(data?.Location)

        // removing temporary watermarked image
        if (additional.isWatermark) {
          fs.unlink(watermarkImage, (err) => {
            if (err) {
              console.error(err)
            }
          })
        }
        logger(filePath, 'upload').write(`Sucess uploading file ${fileNames} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
      });
    })
    return {
      pathForDatabase: await bucketPath,
      fileNames,
      status: !!await bucketPath
    }
  } catch (error) {
    console.error('Error Upload : ', error)
    return {
      pathForDatabase: defaults,
      fileNames: defaults,
      status: false
    }
  }
}

const generateUploadUpdated = async (req, file, row, defaults = '', additional = {
  isWatermark: false, isPrivate: false, isContentType: false, fileNames: '', compressImage: false
}) => {
  try {
    // If AWS is disabled, return row payload as is
    if (!isAwsEnabled) {
      console.log('AWS is disabled, returning row payload for upload update')
      return row?.payload
    }

    const filePath = `user-upload-put-${logDateFormat()}.txt`
    let fileName = req?.files[file?.num]?.fieldname ? `${file?.name !== '' ? `${file?.name}-` : ''}${Date.now()}${path.extname(req?.files[file?.num]?.originalname)}` : defaults
    const pathBucket = additional.isPrivate ? `${process.env.AWS_BUCKET_PRIVATE}/${file?.path}` : `${process.env.AWS_BUCKET}/${file?.path}`
    const { pathForDatabase } = generateFolder(pathBucket)
    let { buffer } = req.files[file?.num];
    const mime = req?.files[file?.num]?.mimetype
    const method = additional.isPrivate ? awsBucketPrivate : awsBucket
    const bucket = additional.isPrivate ? process.env.AWS_BUCKET_PRIVATE : process.env.AWS_BUCKET
    const ACL = additional.isPrivate ? { ACL: 'authenticated-read' } : { ACL: 'public-read' };
    const ContentType = additional.isContentType ? { ContentType: mime } : {};
    let watermarkImage;
    if (additional.isWatermark) {
      const pathWatermarked = path.join(__dirname, `../../storages/tmp/${fileName}`);
      watermarkImage = await addWatermark(buffer, pathWatermarked);
      buffer = fs.readFileSync(watermarkImage)
      fileName = additional.fileNames ? `watermark-${additional.fileNames}` : `watermark-${fileName}`;
    }

    if (additional.compressImage) {
      buffer = await resizeImage(buffer, mime, fileName)
    }

    const params = {
      Bucket: pathForDatabase,
      Key: fileName,
      Body: buffer,
      ...ContentType,
      ...ACL,
    };
    if (row?.column) {
      const url = row?.column ?? '';
      const splitter = '//'
      const indexOf = url.indexOf(splitter);
      const slicing = url.slice(indexOf + splitter.length)
      const split = slicing.split('.com/')[1]
      const pathOnly = split.substring(0, split.lastIndexOf('/'))

      const paramsDelete = {
        Bucket: `${bucket}/${pathOnly}`,
        Key: path.basename(url)
      };

      // Uploading files to the bucket
      const bucketPath = new Promise((resolve) => {
        method.putObject(paramsDelete, (errs) => {
          if (errs) {
            console.error('error aws delete', errs)
            logger(filePath, 'upload').write(`Error uploading file ${fileName} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
          }
          method.upload(params, (errsPut, dataPut) => {
            if (errsPut) {
              console.error('error aws put', errsPut)
              logger(filePath, 'upload').write(`Error uploading file ${fileName} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
            }
            resolve(dataPut?.Location)
            // removing temporary watermarked image
            if (additional.isWatermark) {
              fs.unlink(watermarkImage, (err) => {
                if (err) {
                  console.error(err)
                }
              })
            }

            logger(filePath, 'upload').write(`Sucess uploading file ${fileName} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
          });
          logger(filePath, 'upload').write(`Sucess uploading file ${fileName} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
        });
      })
      row.payload[row?.payloadName] = await bucketPath
    } else {
      // Uploading files to the bucket
      const bucketPath = new Promise((resolve) => {
        method.upload(params, (errsPut, dataPut) => {
          if (errsPut) {
            console.error('error aws put', errsPut)
            logger(filePath, 'upload').write(`Error uploading file ${fileName} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
          }
          resolve(dataPut?.Location)

          // removing temporary watermarked image
          if (additional.isWatermark) {
            fs.unlink(watermarkImage, (err) => {
              if (err) {
                console.error(err)
              }
            })
          }

          logger(filePath, 'upload').write(`Sucess uploading file ${fileName} to bucket ${pathForDatabase} ${logDateFormat()}\n`)
        });
      })
      row.payload[row?.payloadName] = await bucketPath
    }

    return row?.payload
  } catch (error) {
    console.error('Error Upload Put: ', error)
    return row?.payload
  }
}

const storeToAws = async (
  options
) => {
  try {
    // If AWS is disabled, return error status
    if (!isAwsEnabled) {
      console.log('AWS is disabled, returning error status for storeToAws')
      return {
        status: false,
        path: '',
        error: { message: 'AWS is disabled' }
      }
    }

    const bucketNamePublic = process.env.AWS_BUCKET;
    const bucketNamePrivate = process.env.AWS_BUCKET_PRIVATE;
    const buffer = options?.buffer;
    const mime = options?.mime ?? '';
    const client = options.is_private === true ? awsBucketPrivate : awsBucket;
    const bucketConfig = options.is_private === true ? bucketNamePrivate : bucketNamePublic;
    const ACL = options.is_private === true ? { ACL: 'authenticated-read' } : { ACL: 'public-read' };
    const ContentType = { ContentType: mime };
    const fileName = options?.file_name ?? '';
    const originalName = options?.original_name ?? '';
    const pathFile = options?.path ?? '';

    const bucket = options.is_private === true ? `${process.env.AWS_BUCKET_PRIVATE}/${pathFile}` : `${process.env.AWS_BUCKET}/${pathFile}`
    const { pathForAws } = generateFolderWithSlash(bucket, fileName, originalName)

    const params = {
      Bucket: bucketConfig,
      Key: pathForAws,
      Body: buffer,
      ...ContentType,
      ...ACL
    };

    const bucketPath = new Promise((resolve) => {
      client.upload(params, (errs, data) => {
        if (errs) {
          console.error('error aws', errs)
        }
        resolve(data?.Location)

        console.log('aws success', data)
      });
    })
    return {
      status: true,
      path: await bucketPath
    }
  } catch (error) {
    console.log('error uploaded file', error);
    error.path_filename = __filename;
    return {
      status: false,
      path: '',
      error
    };
  }
};

const singleUploadFileToStorage = async (
  req,
  customFileName,
  customFilePath,
  accessPrivate = true
) => {
  if (req?.file) {
    const option = {
      buffer: req?.file?.buffer,
      mime: req?.file?.mimetype,
      original_name: req?.file?.originalname,
      is_private: accessPrivate,
      path: customFilePath,
      file_name: customFileName
    };
    const result = await storeToAws(option);

    if (result?.status && result?.path !== '') {
      return { success: result.status, path: result.path };
    }
  }

  return { success: false, path: null };
};

module.exports = {
  generateUpload,
  generateUploadUpdated,
  singleUploadFileToStorage,
  storeToAws
}
