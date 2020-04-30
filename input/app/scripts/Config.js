// Configuration for default annotation server
let defaultAnnotationServer
// PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Collect(p | IF p->pv:Name() = AnnotationServer->pv:Attribute('defaultAnnotationServer') THEN 1 ELSE 0 ENDIF)->pv:Contains(1), LINE)
// eslint-disable-next-line quotes
defaultAnnotationServer = "PVSCL:EVAL(AnnotationServer->pv:Attribute('defaultAnnotationServer')->pv:ToLowerCase())"
// PVSCL:ELSECOND
defaultAnnotationServer = "PVSCL:EVAL(AnnotationServer->pv:SelectedChildren('ps:annotationServer')->pv:Item(0)->pv:Name()->pv:ToLowerCase())"
// PVSCL:ENDCOND

// Tags configuration
let grouped = {
// PVSCL:IFCOND(CodebookTypology->pv:Attribute('name')->pv:ToLowerCase()->pv:Size()>1, LINE)		
  group: 'PVSCL:EVAL(CodebookTypology->pv:Attribute('name')->pv:ToLowerCase())'
// PVSCL:ELSECOND
  group: 'theme'
// PVSCL:ENDCOND
}
// PVSCL:IFCOND(Hierarchy,LINE)
grouped['subgroup'] = 'code'
grouped['relation'] = 'isCodeOf'
// PVSCL:ENDCOND
let tags = {
  grouped: grouped,
  motivation: 'motivation'
}
// PVSCL:IFCOND(MoodleResource, LINE)
tags['producer'] = 'teacher'
tags['consumer'] = 'student'
// PVSCL:ENDCOND
// PVSCL:IFCOND(GoogleSheetProvider, LINE)
tags['statics'] = {
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
  // PVSCL:IFCOND(Codebook, LINE)
  codebook: 'PVSCL:EVAL(Codebook->pv:Attribute('name')->pv:ToLowerCase())',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Codebook, LINE)
  cmapCloudConfiguration: {
    user: 'highlight01x@gmail.com',
    password: 'producto1',
    uid: '1cf684dc-1764-4e5b-8122-7235ca19c37a'
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

module.exports = Config
