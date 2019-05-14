const LanguageUtils = require('../utils/LanguageUtils')
const jsYaml = require('js-yaml')
const _ = require('lodash')

class Theme {
  constructor ({id, name, color, annotationGuide, description}) {
    this.id = id
    this.name = name
    this.color = color
    this.annotationGuide = annotationGuide
    this.description = description
 // PVSCL:IFCOND(Code,LINE)
    this.codes = []
 // PVSCL:ENDCOND
  }

  toAnnotations () {
    let annotations = []
    // Create its annotations
    annotations.push(this.toAnnotation())
    // PVSCL:IFCOND(Code,LINE)
    // Create its children annotations
    for (let i = 0; i < this.codes.length; i++) {
      annotations = annotations.concat(this.codes[i].toAnnotations())
    }
    // PVSCL:ENDCOND
    return annotations
  }

  toAnnotation () {
    return {
      group: this.annotationGuide.storage.group.id,
      permissions: {
        read: ['group:' + this.annotationGuide.storage.group.id]
      },
      references: [],
      tags: ['oa:theme:' + LanguageUtils.normalizeString(this.name)],
      target: [],
      text: jsYaml.dump({
        description: this.description
        // custom: this.custom
      }),
      uri: this.annotationGuide.storage.group.links.html
    }
  }

  static fromAnnotations () {
    // TODO Xabi
  }

  static fromAnnotation (annotation, annotationGuide = {}) {
    let themeTag = _.find(annotation.tags, (tag) => {
      return tag.includes('oa:theme:')
    })
    if (_.isString(themeTag)) {
      let name = themeTag.replace('oa:theme:', '')
      let config = jsYaml.load(annotation.text)
      if (_.isObject(config)) {
        // let criteriaId = config.criteriaId
        let description = config.description
        let id = annotation.id
        return new Theme({id, name, description, annotationGuide})
      } else {

      }
    } else {
      console.error('Unable to retrieve criteria from annotation')
    }
  }
}

module.exports = Theme
