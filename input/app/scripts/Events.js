const Events = {
  annotate: 'annotate',
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
  // PVSCL:IFCOND(Hierarchy, LINE)
  createCode: 'createCode',
  codeCreated: 'codeCreated',
  // PVSCL:ENDCOND
  renameCodebook: 'renameCodebook',
  // PVSCL:ENDCOND
  targetChanged: 'targetChanged',
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
  updatedCurrentAnnotations: 'updatedCurrentAnnotations'
}

module.exports = Events
