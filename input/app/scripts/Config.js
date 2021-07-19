// Configuration for default annotation server
let defaultAnnotationServer
// PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Collect(p | IF p->pv:Name() = AnnotationServer->pv:Attribute('defaultAnnotationServer') THEN 1 ELSE 0 ENDIF)->pv:Contains(1), LINE)
// eslint-disable-next-line quotes
defaultAnnotationServer = "PVSCL:EVAL(AnnotationServer->pv:Attribute('defaultAnnotationServer')->pv:ToLowerCase())"
// PVSCL:ELSECOND
defaultAnnotationServer = "PVSCL:EVAL(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Item(0)->pv:Name()->pv:ToLowerCase())"
// PVSCL:ENDCOND
let defaultGroupName = 'DefaultCodebook'
// PVSCL:IFCOND(CodebookCreate, LINE)
// eslint-disable-next-line quotes
defaultGroupName = "PVSCL:EVAL(CodebookCreate->pv:Attribute('defaultCodebookName'))"
// PVSCL:ENDCOND

// Tags configuration
const grouped = {
  group: 'theme'
}
// PVSCL:IFCOND(Hierarchy,LINE)
grouped.subgroup = 'code'
grouped.relation = 'isCodeOf'
// PVSCL:ENDCOND
const tags = {
  grouped: grouped,
  motivation: 'motivation'
}
// PVSCL:IFCOND(MoodleResource, LINE)
tags.producer = 'teacher'
tags.consumer = 'student'
// PVSCL:ENDCOND
// PVSCL:IFCOND(GoogleSheetProvider OR MixedMultivalued, LINE)
tags.statics = {
  multivalued: 'multivalued',
  inductive: 'inductive',
  validated: 'validated',
  spreadsheet: 'spreadsheet'
}
// PVSCL:ENDCOND
const Config = {
  // PVSCL:IFCOND(BuiltIn or EmptyCodebook or ApplicationBased OR NOT(Codebook), LINE)
  groupName: defaultGroupName,
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(GoogleSheetAnnotationServer OR GoogleSheetAuditLog, LINE)
  googleSheetConfig: {
    db: 323696129,
    template: '1nX0WP0YHvHAlog75_cnBkLxQ3uB0QV9Jj4ZFczkPuJw',
    papers: 'PrimaryStudies'
  },
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Filter, LINE)
  filter: {
    // eslint-disable-next-line quotes
    userFilter: { individual: "PVSCL:EVAL(UserFilter->pv:Attribute('individual'))" }
  },
  // PVSCL:ENDCOND
  defaultAnnotationServer: defaultAnnotationServer,
  namespace: 'oa',
  // eslint-disable-next-line quotes
  urlParamName: "PVSCL:EVAL(WebAnnotator.WebAnnotationClient->pv:Attribute('appShortName'))", // Name to activate the extension if the url contains this hash param
  tags: tags,
  colors: {
    minAlpha: 0.2,
    maxAlpha: 0.8
  },
  assessmentCategories: [{
    name: 'Minor weakness'
  }, {
    name: 'Major weakness'
  }, {
    name: 'Strength'
  }]
}

export default Config
