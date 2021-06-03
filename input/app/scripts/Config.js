// Configuration for default annotation server
let defaultAnnotationServer
// PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Collect(p | IF p->pv:Name() = AnnotationServer->pv:Attribute('defaultAnnotationServer') THEN 1 ELSE 0 ENDIF)->pv:Contains(1), LINE)
// eslint-disable-next-line quotes
defaultAnnotationServer = "PVSCL:EVAL(AnnotationServer->pv:Attribute('defaultAnnotationServer')->pv:ToLowerCase())"
// PVSCL:ELSECOND
defaultAnnotationServer = "PVSCL:EVAL(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Item(0)->pv:Name()->pv:ToLowerCase())"
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
// PVSCL:IFCOND(GoogleSheetProvider, LINE)
tags.statics = {
  multivalued: 'multivalued',
  inductive: 'inductive',
  validated: 'validated',
  spreadsheet: 'spreadsheet'
}
// PVSCL:ENDCOND
const Config = {
  // PVSCL:IFCOND(BuiltIn or ApplicationBased OR NOT(Codebook), LINE)
  groupName: 'DefaultReviewModel',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(GoogleSheetAnnotationServer, LINE)
  spreadsheetsIds: {
    setClassifyingRange: '%27LOG-classifying%27%21A4%3AN',
    setCodebookDevelopmentRange: '%27LOG-codebookDevelopment%27%21A%3AO',
    setPaperRange: '%27Papers%27%21A%3AG',
    setLinkingRange: '%27LOG-linking%27%21A%3AH',
    setAssessingRange: '%27LOG-assessing%27%21A%3AJ',
    getClassifyingRange: '%27LOG-classifying%27!M4%3AN',
    getCodebookDevelopmentRange: '%27LOG-codebookDevelopment%27!M4%3AN',
    getPaperRange: '%27Papers%27!A2%3AE',
    getLinkingRange: '%27LOG-linking%27!G3%3AH',
    getAssessingRange: '%27LOG-assessing%27!I4%3AJ'
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
