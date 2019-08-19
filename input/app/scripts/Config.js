const Config = {
  // PVSCL:IFCOND(User or ApplicationBased, LINE)
  groupName: 'DefaultReviewModel',
  // PVSCL:ENDCOND
  namespace: 'oa',
  urlParamName: 'spl', // Name to activate the extension if the url contains this hash param
  tags: { // Defined tags for the domain
    grouped: { // Grouped annotations
      group: 'theme'PVSCL:IFCOND(Code),
      subgroup: 'code',
      relation: 'isCodeOf'PVSCL:ENDCOND
    },
    motivation: 'motivation'PVSCL:IFCOND(GSheetProvider),
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
