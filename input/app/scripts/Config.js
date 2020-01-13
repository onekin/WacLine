// Configuration for default storage
let defaultStorage
// PVSCL:IFCOND(AnnotationServer->pv:SelectedChildren()->pv:Collect(p | IF p->pv:Name() = AnnotationServer->pv:Attribute('defaultStorage') THEN 1 ELSE 0 ENDIF)->pv:Contains(1), LINE)
// eslint-disable-next-line quotes
defaultAnnotationServer = "PVSCL:EVAL(AnnotationServer->pv:Attribute('defaultStorage')->pv:ToLowerCase())"
// PVSCL:ELSECOND
defaultAnnotationServer = 'PVSCL:EVAL(AnnotationServer->pv:SelectedChildren()->pv:Item(0)->pv:Name()->pv:ToLowerCase())'
// PVSCL:ENDCOND

// Tags configuration
let grouped = {
  group: 'theme'
}
// PVSCL:IFCOND(Code,LINE)
grouped['subgroup'] = 'code'
grouped['relation'] = 'isCodeOf'
// PVSCL:ENDCOND
let tags = {
  grouped: grouped,
  motivation: 'motivation'
}
// PVSCL:IFCOND(MoodleURL, LINE)
tags['producer'] = 'teacher'
tags['consumer'] = 'student'
// PVSCL:ENDCOND
// PVSCL:IFCOND(GSheetProvider, LINE)
tags['statics'] = {
  multivalued: 'multivalued',
  inductive: 'inductive',
  validated: 'validated',
  spreadsheet: 'spreadsheet'
}
// PVSCL:ENDCOND
const Config = {
  // PVSCL:IFCOND(User or ApplicationBased, LINE)
  groupName: 'DefaultReviewModel',
  // PVSCL:ENDCOND
  defaultStorage: defaultStorage,
  namespace: 'oa',
  // eslint-disable-next-line quotes
  urlParamName: "PVSCL:EVAL(WebAnnotator.WebAnnotationClient->pv:Attribute('appShortName'))", // Name to activate the extension if the url contains this hash param
  tags: tags,
  colors: {
    minAlpha: 0.2,
    maxAlpha: 0.8
  }
}

module.exports = Config
