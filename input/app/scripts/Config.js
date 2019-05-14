const Config = {
  groupName: 'ReviewAndGo',
  namespace: 'oa',
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
