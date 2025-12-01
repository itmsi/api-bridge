const fs = require('fs')

const excelGenerator = async (workbook, filepath) => {
  try {
    const folderPath = 'public/excel';

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath)
    }

    const stream = fs.createWriteStream(filepath);

    return await new Promise((resolve, reject) => {
      stream.on('finish', () => {
        const msg = `Successfully to create file ${filepath}`
        resolve(msg);
      });

      stream.on('error', (err) => {
        reject(err);
      });

      workbook.xlsx.write(stream);
    });

  } catch (err) {
    // console.log(err)
    return err;
  }
}


module.exports = {
  excelGenerator,
}
