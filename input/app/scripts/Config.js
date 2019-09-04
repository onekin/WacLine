const Config = {
  // PVSCL:IFCOND(User or ApplicationBased, LINE)
  groupName: 'DefaultReviewModel',
  // PVSCL:ENDCOND
  // PVSCL:IFCOND(Storage->pv:SelectedChildren()->pv:Collect(p | IF p->pv:Name() = Storage->pv:Attribute('defaultStorage') THEN 1 ELSE 0 ENDIF)->pv:Contains(1), LINE)
  defaultStorage: 'PVSCL:EVAL(Storage->pv:Attribute('defaultStorage')->pv:ToLowerCase())',
  // PVSCL:ELSECOND
  defaultStorage: 'PVSCL:EVAL(Storage->pv:SelectedChildren()->pv:Item(0)->pv:Name()->pv:ToLowerCase())',
  // PVSCL:ENDCOND
  namespace: 'oa',
  urlParamName: 'spl', // Name to activate the extension if the url contains this hash param
  tags: { // Defined tags for the domain
    grouped: { // Grouped annotations
      group: 'theme'PVSCL:IFCOND(Code),
      subgroup: 'code',
      relation: 'isCodeOf'PVSCL:ENDCOND
    },
    motivation: 'motivation'PVSCL:IFCOND(MoodleURL),
    producer: 'teacher',
    consumer: 'student'PVSCL:ENDCONDPVSCL:IFCOND(GSheetProvider),
    statics: { // Other static tags specific for the domain
      multivalued: 'multivalued',
      inductive: 'inductive',
      validated: 'validated',
      spreadsheet: 'spreadsheet'
    }PVSCL:ENDCOND
  },
  colors: {
    minAlpha: 0.2,
    maxAlpha: 0.8
  }
}

module.exports = Config
