const Config = {
  review: {
    groupName: 'ReviewAndGo',
    namespace: 'review',
    tags: { // Defined tags for the domain
      grouped: { // Grouped annotations
        group: 'criteria',
        subgroup: 'level',
        relation: 'isCriteriaOf'
      }
    }
  }
}

module.exports = Config
