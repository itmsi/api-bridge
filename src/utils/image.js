const sharp = require('sharp');
const { logger } = require('./logger');
const { logDateFormat } = require('./date');

/**
 * function resize image
 *
 * @param {Buffer} bufferImage Image File
 * @param {string} mime mimetype
 * @param {string} inv_number Inventory Identity
 * @returns Buffer
 */
const resizeImage = async (bufferImage, mime, inv_number) => {
  const filePath = `resize-image-${logDateFormat()}.txt`;
  try {
    let resizingProcess = null;
    // eslint-disable-next-line default-case
    switch (mime) {
      case 'image/png':
        resizingProcess = sharp(bufferImage).png({ quality: 50 });
        break;

      case 'image/jpeg':
        resizingProcess = sharp(bufferImage).jpeg({ quality: 50, mozjpeg: true });
        break;
    }
    const result = await resizingProcess.toBuffer();
    return result
  } catch (error) {
    console.error(error);
    logger(filePath, 'upload').write(
      `Error resize image file inv number : ${inv_number}. ${logDateFormat()}\n`
    );
    return false;
  }
};

module.exports = resizeImage;
