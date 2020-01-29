const Events = {
  annotationCreated: 'annotationCreated',
  annotationUpdated: 'annotationUpdated',
  annotationDeleted: 'annotationDeleted',
  // PVSCL:IFCOND(Validate,LINE)
  annotationValidated: 'annotationValidated',
  // PVSCL:ENDCOND
  createAnnotation: 'createAnnotation',
  updateAnnotation: 'updateAnnotation',
  deleteAnnotation: 'deleteAnnotation',
  // PVSCL:IFCOND(Codebook, LINE)
  createCodebook: 'createCodebook',
  codebookCreated: 'codebookCreated',
  createTheme: 'createTheme',
  themeCreated: 'themeCreated',
  removeTheme: 'removeTheme',
  themeRemoved: 'themeRemoved',
  // PVSCL:IFCOND(Hierarchy, LINE)
  createCode: 'createCode',
  codeCreated: 'codeCreated',
  removeCode: 'removeCode',
  codeRemoved: 'codeRemoved',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(RenameCodebook,LINE)
  renameCodebook: 'renameCodebook',
  codebookRenamed: 'codebookRenamed',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ExportCodebook,LINE)
  exportCodebook: 'exportCodebook',
  codebookExported: 'codebookExported',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(ImportCodebook,LINE)
  importCodebook: 'importCodebook',
  codebookImported: 'codebookImported',
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(CodebookDelete,LINE)
  deleteCodebook: 'deleteCodebook',
  codebookDeleted: 'codebookDeleted',
  // PVSCL:ENDCOND
  targetChanged: 'targetChanged', // TODO Review if it is used somewhere
  // PVSCL:IFCOND(SingleCode,LINE)
  codeToAll: 'codeToAll',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Manual,LINE)
  groupChanged: 'groupChanged',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(UserFilter,LINE)
  userFilterChange: 'userFilterChange',
  // PVSCL:ENDCOND
  updatedAllAnnotations: 'updatedAllAnnotations',
  updatedDocumentURL: 'updatedDocumentURL',
  // PVSCL:IFCOND(Comment,LINE)
  comment: 'annotationComment',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Reply,LINE)
  reply: 'reply',
  // PVSCL:ENDCOND
  tagsUpdated: 'tagsUpdated',
  // PVSCL:IFCOND(DeleteAll,LINE)
  deleteAllAnnotations: 'deleteAllAnnotations',
  deletedAllAnnotations: 'deletedAllAnnotations',
  // PVSCL:ENDCOND
  updatedCurrentAnnotations: 'updatedCurrentAnnotations',
  codebookRead: 'codebookRead'
}

module.exports = Events
