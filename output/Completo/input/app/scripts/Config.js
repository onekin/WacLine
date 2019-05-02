const Config = {
  purposeReading: {
    contentAnnotator: 'text',
    namespace: 'purpose',
    sidebar: {
    },
    location: true,
    tags: {}
  },
  slrDataExtraction: {
    contentAnnotator: 'text', // Type of content annotator
    namespace: 'slr', // Namespace for the annotations
    sidebar: {},
    location: true, // Location mode
    userFilter: true,
    tags: { // Defined tags for the domain
      grouped: { // Grouped annotations
        group: 'facet',
        subgroup: 'code',
        relation: 'isCodeOf'
      },
      statics: { // Other static tags specific for the domain
        multivalued: 'multivalued',
        inductive: 'inductive',
        validated: 'validated',
        spreadsheet: 'spreadsheet'
      }
    }
  },
  exams: {
    contentAnnotator: 'text',
    namespace: 'exam',
    sidebar: {},
    location: true,
    pattern: '',
    tags: { // Defined tags for the domain
      grouped: { // Grouped annotations
        group: 'criteria',
        subgroup: 'mark',
        relation: 'isCriteriaOf'
      },
      statics: { // Other static tags specific for the domain
        multivalued: 'multivalued',
        inductive: 'inductive',
        validated: 'validated',
        spreadsheet: 'spreadsheet',
        teacher: 'teacher',
        reviewed: 'reviewed'
      }
    }
  }
}

module.exports = Config
