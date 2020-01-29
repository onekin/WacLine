const _ = require('lodash')
const $ = require('jquery')
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
    // Remove creator event listeners
    let codebookCreatorEvents = _.values(this.codebookCreator.events)
    for (let i = 0; i < codebookCreatorEvents.length; i++) {
      codebookCreatorEvents[i].element.removeEventListener(codebookCreatorEvents[i].event, codebookCreatorEvents[i].handler)
    }
    // Destroy codebook reader
    this.codebookReader.destroy()
    // PVSCL:IFCOND(CodebookUpdate, LINE)
    // Remove updater event listeners
    let codebookUpdaterEvents = _.values(this.codebookUpdater.events)
    for (let i = 0; i < codebookCreatorEvents.length; i++) {
      codebookUpdaterEvents[i].element.removeEventListener(codebookUpdaterEvents[i].event, codebookUpdaterEvents[i].handler)
    }
    // PVSCL:ENDCOND
    // Remove tags wrapper
    $('#tagsWrapper').remove()
  }
}

module.exports = CodebookManager
