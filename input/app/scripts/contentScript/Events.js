const Events = {
  annotate: 'annotate',
  annotationCreated: 'annotationCreated',
  annotationDeleted: 'annotationDeleted',
  //PVSCL:IFCOND(Validate,LINE)
  annotationValidated: 'annotationValidated',
  //PVSCL:ENDCOND
  //PVSCL:IFCOND(Manual,LINE)
  groupChanged: 'groupChanged',
  //PVSCL:ENDCOND
  mark: 'mark',
  //PVSCL:IFCOND(UserFilter,LINE)
  userFilterChange: 'userFilterChange',
  //PVSCL:ENDCOND
  updatedAllAnnotations: 'updatedAllAnnotations',
  updatedDocumentURL: 'updatedDocumentURL',
  //PVSCL:IFCOND(Comment,LINE)
  comment: 'annotationComment',
  //PVSCL:ENDCOND
  //PVSCL:IFCOND(Reply,LINE)
  reply: 'reply',
  //PVSCL:ENDCOND
  tagsUpdated: 'tagsUpdated',
  //PVSCL:IFCOND(DeleteGroup,LINE)
  deleteAllAnnotations: 'deleteAllAnnotations',
  deletedAllAnnotations: 'deletedAllAnnotations',
  //PVSCL:ENDCOND
  updatedCurrentAnnotations: 'updatedCurrentAnnotations'
}

module.exports = Events
