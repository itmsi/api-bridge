const fs = require('fs')
const PdfPrinter = require('pdfmake')

/* doc
https://github.com/bpampuch/pdfmake/tree/master/examples
https://github.com/bpampuch/pdfmake/tree/master/examples/pdfs
*/

const pdfGenerator = async (docDefinition, filePath) => new Promise((resolve, reject) => {
  try {
    const folderPath = 'public/pdf';

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath)
    }
    const fonts = {
      Roboto: {
        normal: 'static/fonts/Roboto-Regular.ttf',
        bold: 'static/fonts/Roboto-Medium.ttf',
        italics: 'static/fonts/Roboto-Italic.ttf',
        bolditalics: 'static/fonts/Roboto-MediumItalic.ttf'
      },
      Arial: {
        normal: 'static/fonts/arial.ttf',
        bold: 'static/fonts/arial.ttf',
      }
    }
    const printer = new PdfPrinter(fonts)
    const pdfDoc = printer.createPdfKitDocument(docDefinition)
    const stream = pdfDoc.pipe(fs.createWriteStream(filePath))
    stream.on('finish', () => {
      const pdfFile = fs.readFileSync(filePath)
      resolve({
        pdfFile,
        path: filePath
      })
    })
    pdfDoc.end();
  } catch (err) {
    // console.log(err)
    reject(err)
  }
})

const pdfGeneratorDebug = async (docDefinition, filePath, res) => new Promise((resolve, reject) => {
  try {
    const folderPath = 'public/pdf';

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath)
    }
    const fonts = {
      Roboto: {
        normal: 'static/fonts/Roboto-Regular.ttf',
        bold: 'static/fonts/Roboto-Medium.ttf',
        italics: 'static/fonts/Roboto-Italic.ttf',
        bolditalics: 'static/fonts/Roboto-MediumItalic.ttf'
      },
      Arial: {
        normal: 'static/fonts/arial.ttf',
        bold: 'static/fonts/arial.ttf',
      }
    }
    const printer = new PdfPrinter(fonts)
    const pdfDoc = printer.createPdfKitDocument(docDefinition)
    const stream = pdfDoc.pipe(fs.createWriteStream(filePath))
    stream.on('finish', () => {
      const pdfFile = fs.readFileSync(filePath)
      /* uncomment this line for local debug mode pdf in browser */
      res.contentType('application/pdf')
      res.send(pdfFile)
      fs.unlinkSync(filePath)
      /* end debug mode */
      resolve(pdfFile)
    })
    pdfDoc.end();
  } catch (err) {
    console.log(err)
    reject(err)
  }
})

module.exports = {
  pdfGenerator,
  pdfGeneratorDebug
}
