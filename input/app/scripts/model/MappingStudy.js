class MappingStudy {
  constructor (name) {
    this.name = name || ''
    this.facets = []
    this.hypothesisGroup = null
    this.spreadsheetId = null
    this.sheetId = null
  }
}

module.exports = MappingStudy
