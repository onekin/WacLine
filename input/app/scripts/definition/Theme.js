const jsYaml = require('js-yaml')
const _ = require('lodash')
const Config = require('../Config')
// PVSCL:IFCOND(Dynamic, LINE)
const ColorUtils = require('../utils/ColorUtils')
// PVSCL:ENDCOND

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
    let themeTag = Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name
    let motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    let tags = [themeTag, motivationTag]
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
      motivation: 'codebookDevelopment',
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
  // PVSCL:IFCOND(Dynamic, LINE) // Check if it is possible to add codes to the definition model if it is not selected Dynamic feature
  // PVSCL:IFCOND(Code, LINE)

  addCode (code) {
    this.codes.push(code)
    // Re-set colors for each code
    this.reloadColorsForCodes()
  }

  removeCode (code) {
    _.remove(this.codes, code)
    // Re-set colors for each code
    this.reloadColorsForCodes()
  }
  // PVSCL:ENDCOND
  // PVSCL:ENDCOND
//PVSCL:IFCOND(Dynamic, LINE)

  reloadColorsForCodes () {
    this.codes.forEach((code, j) => {
      let alphaForChild = (Config.colors.maxAlpha - Config.colors.minAlpha) / this.codes.length * (j + 1) + Config.colors.minAlpha
      code.color = ColorUtils.setAlphaToColor(this.color, alphaForChild)
    })
  }
  // PVSCL:ENDCOND
}

module.exports = Theme
