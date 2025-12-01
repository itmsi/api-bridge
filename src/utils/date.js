const moment = require('moment');

const FULL_FORMAT = 'DD/MM/YYYY H:mm:ss';
const DATE_FORMAT_INDO = 'DD MMMM YYYY, H:mm:ss';
const FULL_FORMAT_CONVERT = 'YYYYMMDDhmmss';
const FULL_FORMAT_DB = 'YYYY-MM-DD H:mm:ss';
const LOG_FORMAT = 'DD-MM-YYYY';

const fullDateFormat = (date) => {
  if (date) {
    return moment(new Date(date).getTime()).format(FULL_FORMAT);
  }
  return date;
};
const fullDateFormatIndo = (date) => {
  const dateManipualte = moment(new Date(date).getTime()).format(
    DATE_FORMAT_INDO
  );
  const getNameDay = moment(date).locale('id').format('dddd');

  return `${getNameDay}, ${dateManipualte}`;
};
const logDateFormat = (date = Date.now()) => {
  const format = moment(new Date(date).getTime()).format(LOG_FORMAT);
  return format;
};

const dateNow = () => new Date().toISOString();

const customDateFormat = (date, format = 'YYYY-MM-DD') => {
  const newDate = moment(date).format(format);
  return newDate;
};

const todayFormat = (format, date = new Date().toISOString()) => {
  const newDate = moment(new Date(date)).format(format);
  return newDate;
};

const dateStrConvertion = (date, to, from = 'DD/MM/YYYY') => {
  const formatStr = moment(date, from).toDate();

  return moment(formatStr).format(to);
};

const strToDate = (str, from = 'DD/MM/YYYY') => moment(str, from).toDate();

const standartDate = (date, format, defaults = '') => {
  let formats;
  if (defaults) {
    formats = defaults;
  } else {
    formats = 'DD/MM/YYYY';
  }
  const newDate = moment(date, formats).format(format);
  return newDate;
};

const datePlus = (date, plus, flag, toFormat, defaultFormat = 'DD/MM/YYYY') => {
  const newDate = moment(date, defaultFormat).add(plus, flag).format(toFormat);
  return newDate;
};

const expiredCheck = (date, format = 'YYYY-MM-DD[T]HH:mm[Z]') => {
  const active_time = moment.utc(new Date().toISOString(), format);
  const current_time = moment.utc(date, format);
  const verify = moment(active_time).isAfter(current_time ?? active_time);
  return verify;
};

const convertToDate = (
  date,
  format = FULL_FORMAT_CONVERT,
  resultFormat = FULL_FORMAT_DB
) => {
  const convert = moment(date, format).toDate();
  const formatter = moment(convert).format(resultFormat);
  return formatter;
};

const checkValidDate = (date) => {
  const check = moment(date, 'DD/MM/YYYY', true).isValid();
  return check;
};

const manipulateDate = (result, isArray = true) => {
  let mapping;

  if (isArray) {
    mapping = result.map((r) => {
      if (r.auction_start_date) {
        r.auction_start_date = customDateFormat(r.auction_start_date, 'YYYY-MM-DD')
      }

      if (r.auction_car_due_date) {
        r.auction_car_due_date = customDateFormat(r.auction_car_due_date, 'YYYY-MM-DD')
      }

      if (r.auction_deadline_date) {
        r.auction_deadline_date = customDateFormat(r.auction_deadline_date, 'YYYY-MM-DD')
      }

      r.created_at = fullDateFormat(r.created_at);
      r.updated_at = fullDateFormat(r.updated_at);

      if (r.deleted_at) {
        r.deleted_at = fullDateFormat(r.deleted_at);
      }

      return r;
    });
  } else {
    if (result.auction_start_date) {
      result.auction_start_date = customDateFormat(result.auction_start_date, 'YYYY-MM-DD')
    }

    if (result.auction_car_due_date) {
      result.auction_car_due_date = customDateFormat(result.auction_car_due_date, 'YYYY-MM-DD')
    }

    if (result.auction_deadline_date) {
      result.auction_deadline_date = customDateFormat(result.auction_deadline_date, 'YYYY-MM-DD')
    }

    result.created_at = fullDateFormat(result?.created_at);
    result.updated_at = fullDateFormat(result?.updated_at);

    if (result.deleted_at) {
      result.deleted_at = fullDateFormat(result?.deleted_at);
    }

    mapping = result;
  }

  return mapping;
};

const getDiffDate = (date1, date2, type = 'days', format = 'YYYY-MM-DD') => {
  const a = moment(date1, format);
  const b = moment(date2, format);
  return b.diff(a, type);
}

const calculateBusinessDays = (firstDate, secondDate) => {
  const startDate = moment(firstDate, 'MM/DD/YYYY');
  const endDate = moment(secondDate, 'MM/DD/YYYY');
  let BusinessDays = 0;
  const totalDays = endDate.diff(startDate, 'days');

  let date; let i; let dayOfWeek; let
    isWeekend;

  for (i = 1; i <= totalDays; i += 1) {
    if (i === 1) date = startDate.clone();
    else date = date.add(1, 'd');
    dayOfWeek = date.day();
    isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    if (!isWeekend) { BusinessDays += 1; }
  }
  return BusinessDays;
}

/**
 * Helper function to convert date to YYYY-mm-dd format
 * @param {string|Date} dateValue - The date value to convert
 * @returns {string|null} - Formatted date string or null if invalid
 */
const formatDateToYYYYMMDD = (dateValue) => {
  if (!dateValue) return null

  try {
    const date = new Date(dateValue)
    if (Number.isNaN(date.getTime())) return null // Invalid date

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    console.error('Error formatting date:', error)
    return null
  }
}

module.exports = {
  fullDateFormat,
  dateStrConvertion,
  dateNow,
  expiredCheck,
  logDateFormat,
  convertToDate,
  todayFormat,
  fullDateFormatIndo,
  datePlus,
  checkValidDate,
  standartDate,
  customDateFormat,
  strToDate,
  manipulateDate,
  getDiffDate,
  calculateBusinessDays,
  formatDateToYYYYMMDD
};
