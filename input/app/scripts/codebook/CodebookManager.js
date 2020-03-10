import _ from 'lodash'
import CreateCodebook from './operations/create/CreateCodebook'
import ReadCodebook from './operations/read/ReadCodebook'
// PVSCL:IFCOND(CodebookUpdate, LINE)
import UpdateCodebook from './operations/update/UpdateCodebook'
// PVSCL:ENDCOND
// PVSCL:IFCOND(CodebookDelete, LINE)
import DeleteCodebook from './operations/delete/DeleteCodebook'
// PVSCL:ENDCOND
// PVSCL:IFCOND(RenameCodebook, LINE)
import RenameCodebook from './operations/update/RenameCodebook'
// PVSCL:ENDCOND
// PVSCL:IFCOND(ExportCodebook, LINE)
import ExportCodebook from './operations/export/ExportCodebook'
// PVSCL:ENDCOND
// PVSCL:IFCOND(ImportCodebook, LINE)
import ImportCodebook from './operations/import/ImportCodebook'
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

export default CodebookManager
