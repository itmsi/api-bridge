/* eslint-disable no-prototype-builtins */
/* eslint-disable no-restricted-syntax */
const Jimp = require('jimp');
const sizeOf = require('image-size');
const fs = require('fs');

const requestHttp = (req) => ({
  ...req?.params
})

const isNumeric = (str) => {
  if (typeof str !== 'string') return false
  return !Number.isNaN(str) && !Number.isNaN(parseFloat(str))
}

const validationId = (req, name) => {
  let where
  if (isNumeric(req.params[name])) {
    where = requestHttp(req)
  } else {
    where = { [name]: 0 }
  }

  return where
}

const convertToSlug = (text = '') => text.toLowerCase()
  .replace(/[^\w ]+/g, '')
  .replace(/ +/g, '-')

const replaceString = (str, from, to = '') => str.replace(from, to)

const ucword = (str = '') => (`${str}`).replace(/^([a-z])|\s+([a-z])/g, ($1) => $1.toUpperCase())

const alphaNumeric = (data = []) => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < data; i += 1) {
    result += characters.charAt(Math.floor(Math.random()
      * charactersLength));
  }
  return result;
}

const strMasked = (string, mask = '*') => {
  const splitStr = string.split(' ');
  const maskedArr = [];
  splitStr.forEach((item) => {
    let maskedStr = '';
    for (let i = 0; i < item.length; i += 1) {
      if (i === 0) maskedStr = `${maskedStr}${item[i]}`;
      else maskedStr = `${maskedStr}${mask}`;
    }
    maskedArr.push(maskedStr);
  });

  return maskedArr.join(' ');
};

const addWatermark = async (file, target) => {
  const word = 'CONFIDENTIAL';
  const dimensions = sizeOf(file);
  const image = await Jimp.read(file);
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  const width = Jimp.measureText(font, word);
  const height = Jimp.measureTextHeight(font, word, 100);
  const watermark = await Jimp.create(width, height)

  await watermark.print(font, 0, 0, word);
  await watermark.resize(dimensions.width, Jimp.AUTO)
  await watermark.rotate((dimensions.orientation ? 45 : 30))

  await image.composite(watermark, 0, 0, {
    mode: Jimp.BLEND_SOURCE_OVER,
    opacitySource: 0.3,
    opacityDest: 1
  }).writeAsync(target);

  return target;
};

const removeDomain = (url, domain = '.com/') => {
  try {
    const splitter = '//'
    const indexOf = url.indexOf(splitter);
    const slicing = url.slice(indexOf + splitter.length)
    const split = slicing.split(domain)[1]

    return split
  } catch (error) {
    return ''
  }
}

const formatRp = (num, withRp = true) => {
  try {
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(num)) {
      return 'not a number'
    }

    let str = num.toString().replace('', '')
    let parts = false
    const output = []
    let i = 1
    if (str.indexOf('.') > 0) {
      parts = str.split('.')
      // eslint-disable-next-line prefer-destructuring
      str = parts[0] || ''
    }
    str = str.split('').reverse()
    // eslint-disable-next-line no-plusplus
    for (let j = 0, len = str.length; j < len; j++) {
      if (str[j] !== ',') {
        output.push(str[j])
        if (i % 3 === 0 && j < (len - 1)) {
          output.push(',')
        }
        // eslint-disable-next-line no-plusplus
        i++
      }
    }
    const formated = output.reverse().join('')
    const part = ((parts) ? `${parts[1].substr(0, 2)}` : '')
    let result
    if (withRp) {
      result = `Rp ${formated}${part}`
    } else {
      result = `${formated}${part}`
    }
    return result
  } catch (error) {
    return error
  }
}

const formatCurrency = (currency, language = 'id-ID', format = 'IDR') => {
  const moneyFormat = Intl.NumberFormat(language, {
    style: 'currency',
    currency: format
  });

  return moneyFormat.format(currency);
}

const formatCurrencyMin = (currency, language = 'id-ID', format = 'IDR') => {
  const moneyFormat = new Intl.NumberFormat(language, {
    style: 'currency',
    currency: format,
    minimumFractionDigits: 0,
  });

  if (currency < 0) {
    const regex = /^-Rp/;
    const nominal = `-${moneyFormat.format(Math.abs(currency))}`;
    const formattedNominal = nominal.replace(regex, 'Rp -');
    return formattedNominal;
  }

  return moneyFormat.format(currency);
};

const removeNullEmptyElement = (data) => {
  Object.keys(data).forEach((key) => {
    if (data[key] === null || data[key] === '') {
      delete data[key];
    }
  });

  return data;
}

function removeObjectDebitur(data) {
  const obj = data;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)
      && (key === 'debitur_name' || key === 'debitur_ktp_number' || key === 'debitur_contract_number' || key === 'debitur_address' || key === 'is_debitur' || key === 'debitur_type')
    ) {
      delete obj[key];
    }
  }
  return obj;
}

const writeSQL = (sql, filename) => {
  // Write the query to a file
  if (process.env.NODE_ENV === 'development') {
    fs.writeFile(filename, sql, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('Query successfully written to query.sql');
      }
    });
  } else {
    console.log('NODE_ENV is not development, skipping writing sql debug');
  }
}

module.exports = {
  requestHttp,
  isNumeric,
  convertToSlug,
  validationId,
  replaceString,
  ucword,
  formatRp,
  alphaNumeric,
  strMasked,
  removeDomain,
  addWatermark,
  formatCurrency,
  formatCurrencyMin,
  removeNullEmptyElement,
  removeObjectDebitur,
  writeSQL
}
