const jsYaml = require('js-yaml')
const _ = require('lodash')
const Config = require('../Config')

class Code {
  constructor ({id, name, description = '', color, theme}) {
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
    let codeTag = Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + this.name
    let isCodeOfTag = Config.namespace + ':' + Config.tags.grouped.relation + ':' + this.theme.name
    let motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    let tags = [codeTag, isCodeOfTag, motivationTag]
    return {
      id: this.id,
      group: this.theme.annotationGuide.storage.group.id,
      permissions: {
        read: ['group:' + this.theme.annotationGuide.storage.group.id]
      },
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: [],
      text: jsYaml.dump({id: this.id || '', description: this.description}),
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
