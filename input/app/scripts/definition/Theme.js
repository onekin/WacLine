const jsYaml = require('js-yaml')
const _ = require('lodash')
const Config = require('../Config')

class Theme {
  constructor ({id, name, color, annotationGuide, descriptionPVSCL:IFCOND(GSheetProvider and Code), multivalued, inductivePVSCL:ENDCOND}) {
    this.id = id
    this.name = name
    this.color = color
    this.annotationGuide = annotationGuide
// PVSCL:IFCOND(User,LINE)   
    this.description = description
// PVSCL:ENDCOND
// PVSCL:IFCOND(Code,LINE)
    this.codes = []
// PVSCL:ENDCOND
// PVSCL:IFCOND(GSheetProvider and Code,LINE)
    this.multivalued = multivalued
    this.inductive = inductive
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
    let tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name]
// PVSCL:IFCOND(GSheetProvider and Code,LINE)
    if (this.multivalued) {
      tags.push(Config.namespace + ':' + Config.tags.statics.multivalued)
    }
    if (this.inductive) {
      tags.push(Config.namespace + ':' + Config.tags.statics.inductive)
    }
// PVSCL:ENDCOND
    return {
      group: this.annotationGuide.storage.group.id,
      permissions: {
        read: ['group:' + this.annotationGuide.storage.group.id]
      },
      references: [],
      tags: tags,
      target: [],
      text: jsYaml.dump({
      // PVSCL:IFCOND(User,LINE)
        description: this.description
      // PVSCL:ENDCOND
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
    // PVSCL:IFCOND(GSheetProvider and Code,LINE)
    let multivaluedTag = _.find(annotation.tags, (tag) => {
      return tag.includes('oa:multivalued')
    })
    let inductiveTag = _.find(annotation.tags, (tag) => {
      return tag.includes('oa:inductive')
    })
    // PVSCL:ENDCOND
    if (_.isString(themeTag)) {
      let name = themeTag.replace('oa:theme:', '')
      let config = jsYaml.load(annotation.text)
      // PVSCL:IFCOND(GSheetProvider and Code,LINE)
      // multivalued and inductive
      let multivalued = _.isString(multivaluedTag)
      let inductive = _.isString(inductiveTag)
      // PVSCL:ENDCOND
      if (_.isObject(config)) {
        let description = config.description
        let id = annotation.id
        return new Theme({id, name, description, annotationGuidePVSCL:IFCOND(GSheetProvider and Code), multivalued, inductivePVSCL:ENDCOND})
      } else {

      }
    } else {
      console.error('Unable to retrieve criteria from annotation')
    }
  }
}

module.exports = Theme
