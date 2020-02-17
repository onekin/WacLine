const _ = require('lodash')
const CreateCodebook = require('./operations/create/CreateCodebook')
const ReadCodebook = require('./operations/read/ReadCodebook')
// PVSCL:IFCOND(CodebookUpdate, LINE)
const UpdateCodebook = require('./operations/update/UpdateCodebook')
// PVSCL:ENDCOND
// PVSCL:IFCOND(CodebookDelete, LINE)
const DeleteCodebook = require('./operations/delete/DeleteCodebook')
// PVSCL:ENDCOND
// PVSCL:IFCOND(RenameCodebook, LINE)
const RenameCodebook = require('./operations/update/RenameCodebook')
// PVSCL:ENDCOND
// PVSCL:IFCOND(ExportCodebook, LINE)
const ExportCodebook = require('./operations/export/ExportCodebook')
// PVSCL:ENDCOND
// PVSCL:IFCOND(ImportCodebook, LINE)
const ImportCodebook = require('./operations/import/ImportCodebook')
// PVSCL:ENDCOND

class CodebookManager {
  constructor () {
    this.codebookCreator = new CreateCodebook()
    this.codebookReader = new ReadCodebook()
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    this.codebookUpdater = new UpdateCodebook()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(CodebookDelete, LINE)
    this.codebookDeleter = new DeleteCodebook()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(RenameCodebook, LINE)
    this.codebookRenamer = new RenameCodebook()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ExportCodebook, LINE)
    this.codebookExporter = new ExportCodebook()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ImportCodebook, LINE)
    this.codebookImporter = new ImportCodebook()
    // PVSCL:ENDCOND
  }

  init (callback) {
    this.codebookCreator.init()
    this.codebookReader.init(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    this.codebookUpdater.init()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(CodebookDelete, LINE)
    this.codebookDeleter.init()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(RenameCodebook, LINE)
    this.codebookRenamer.init()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ExportCodebook, LINE)
    this.codebookExporter.init()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ImportCodebook, LINE)
    this.codebookImporter.init()
    // PVSCL:ENDCOND
  }

  destroy () {
    // Destroy components of codebook
    this.codebookCreator.destroy()
    this.codebookReader.destroy()
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    this.codebookUpdater.destroy()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(CodebookDelete, LINE)
    this.codebookDeleter.destroy()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(RenameCodebook, LINE)
    this.codebookRenamer.destroy()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ExportCodebook, LINE)
    this.codebookExporter.destroy()
    // PVSCL:ENDCOND
    // PVSCL:IFCOND(ImportCodebook, LINE)
    this.codebookImporter.destroy()
    // PVSCL:ENDCOND
  }
}

module.exports = CodebookManager
