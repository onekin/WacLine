const Config = {
  groupName: 'ReviewAndGo',
  namespace: 'oa',
  urlParamName: 'hag', // Name to activate the extension if the url contains this hash param
  tags: { // Defined tags for the domain
    grouped: { // Grouped annotations
      group: 'theme'PVSCL:IFCOND(Code),
      subgroup: 'code',
      relation: 'isCodeOf'PVSCL:ENDCOND
    }
  },
  colors: {
    minAlpha: 0.2,
    maxAlpha: 0.8
  }
}

module.exports = Config
