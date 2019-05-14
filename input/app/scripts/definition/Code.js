const LanguageUtils = require('../utils/LanguageUtils')
const jsYaml = require('js-yaml')
const _ = require('lodash')

class Code {
  constructor ({id, name, description, color, theme}) {
    this.id = id
    this.name = name
    this.color = color
    this.theme = theme
    this.description = description
  }

  toAnnotations () {
    return [this.toAnnotation()]
  }

  toAnnotation () {
    return {
      id: this.id,
      group: this.theme.annotationGuide.storage.group.id,
      permissions: {
        read: ['group:' + this.theme.annotationGuide.storage.group.id]
      },
      references: [],
      tags: ['oa:isCodeOf:' + LanguageUtils.normalizeString(this.theme.name), 'oa:code:' + this.name],
      target: [],
      text: jsYaml.dump({id: this.id, description: this.description}),
      uri: this.theme.annotationGuide.storage.group.links.html
    }
  }

  static fromAnnotations () {
    // TODO Xabi
  }

  static fromAnnotation (annotation, theme = {}) {
    let codeTag = _.find(annotation.tags, (tag) => {
      return tag.includes('oa:code:')
    })
    if (_.isString(codeTag)) {
      let name = codeTag.replace('oa:code:', '')
      let config = jsYaml.load(annotation.text)
      if (_.isObject(config)) {
        let description = config.description
        let id = annotation.id
        // let levelId = config.levelId
        return new Code({id, name, description, theme})
      } else {
        console.error('Unable to retrieve mark configuration from annotation')
      }
    } else {
      console.error('Unable to retrieve mark from annotation')
    }
  }
}

module.exports = Code
