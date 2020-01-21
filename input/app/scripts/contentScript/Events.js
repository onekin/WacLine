const Events = {
  annotate: 'annotate',
  annotationCreated: 'annotationCreated',
  annotationDeleted: 'annotationDeleted',
  // PVSCL:IFCOND(Validate,LINE)
  annotationValidated: 'annotationValidated',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Codebook, LINE)
  createCodebook: 'createCodebook',
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
  // PVSCL:IFCOND(DeleteGroup,LINE)
  deleteAllAnnotations: 'deleteAllAnnotations',
  deletedAllAnnotations: 'deletedAllAnnotations',
  // PVSCL:ENDCOND
  updatedCurrentAnnotations: 'updatedCurrentAnnotations'
}

module.exports = Events
