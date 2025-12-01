const path = require('path');

const generateFolder = (
  pathName,
  fileName = '',
  originalName = ''
) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  try {
    const pathForDatabase = `${pathName}/${year}/${month}/${date}/`;
    let pathForAws = '';
    if (fileName) {
      const ext = path.extname(originalName);
      pathForAws = `${pathName}/${year}/${month}/${date}/${fileName}${ext}`;
    }
    return {
      status: true,
      pathForAws,
      pathForDatabase
    };
  } catch (error) {
    console.error('Error generated folder : ', error);
    return {
      pathForDatabase: '',
      pathForAws: '',
      status: false
    };
  }
};

const generateFolderWithSlash = (
  pathName,
  fileName = '',
  originalName = ''
) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const date = today.getDate();
  try {
    const pathForDatabase = `/${pathName}/${year}/${month}/${date}/`;
    let pathForAws = '';
    if (fileName) {
      const ext = path.extname(originalName);
      pathForAws = `${pathName}/${year}/${month}/${date}/${fileName}${ext}`;
    }
    return {
      status: true,
      pathForAws,
      pathForDatabase
    };
  } catch (error) {
    console.error('Error generated folder : ', error);
    return {
      pathForDatabase: '',
      pathForAws: '',
      status: false
    };
  }
};

module.exports = {
  generateFolder,
  generateFolderWithSlash
}
