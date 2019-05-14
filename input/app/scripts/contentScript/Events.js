const Events = {
  annotate: 'annotate',
  annotationCreated: 'annotationCreated',
  annotationDeleted: 'annotationDeleted',
  annotationValidated: 'annotationValidated',
  mark: 'mark',
  modeChanged: 'modeChanged',
  userFilterChange: 'userFilterChange',
  updatedAllAnnotations: 'updatedAllAnnotations',
  updatedDocumentURL: 'updatedDocumentURL',
  comment: 'annotationComment',
  reply: 'reply',
  tagsUpdated: 'tagsUpdated',
  //PVSCL:IFCOND(DeleteGroup,LINE)
  deleteAllAnnotations: 'deleteAllAnnotations',
  deletedAllAnnotations: 'deletedAllAnnotations',
  //PVSCL:ENDCOND
  updatedCurrentAnnotations: 'updatedCurrentAnnotations'
}

module.exports = Events
