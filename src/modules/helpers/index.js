const properties = require('./catalogs/properties')
const catalogManager = require('./catalogs/catalog_manager')
const catalogExcel = require('./catalogs/catalog_excel')
const catalogPdf = require('./catalogs/catalog_pdf')


module.exports = {
  ...catalogManager,
  ...properties,
  ...catalogExcel,
  ...catalogPdf
}
