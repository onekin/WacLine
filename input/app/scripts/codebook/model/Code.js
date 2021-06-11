import jsYaml from 'js-yaml'
import _ from 'lodash'
import Config from '../../Config'
import LanguageUtils from '../../utils/LanguageUtils'

class Code {
  constructor ({
    id,
    name,
    description = '',
    createdDate = new Date(),
    updatedDate = new Date(),
    target = [],
    color, theme/* PVSCL:IFCOND(MoodleProvider) */,
    moodleLevelId/* PVSCL:ENDCOND */
  }) {
    this.id = id
    this.name = name
    this.color = color
    this.theme = theme
    this.target = target
    this.description = description
    if (LanguageUtils.isInstanceOf(createdDate, Date)) {
      this.createdDate = createdDate
    } else {
      const timestamp = Date.parse(createdDate)
      if (_.isNumber(timestamp)) {
        this.createdDate = new Date(createdDate)
      }
    }
    if (LanguageUtils.isInstanceOf(updatedDate, Date)) {
      this.updatedDate = updatedDate
    } else {
      const timestamp = Date.parse(updatedDate)
      if (_.isNumber(timestamp)) {
        this.updatedDate = new Date(updatedDate)
      }
    }
    // PVSCL:IFCOND(MoodleProvider, LINE)
    this.moodleLevelId = moodleLevelId
    // PVSCL:ENDCOND
  }

  toAnnotations () {
    return [this.toAnnotation()]
  }

  toAnnotation () {
    const codeTag = Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + this.name
    const isCodeOfTag = Config.namespace + ':' + Config.tags.grouped.relation + ':' + this.theme.name
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    const tags = [codeTag, isCodeOfTag, motivationTag]
    // PVSCL:IFCOND(MoodleProvider, LINE)
    const cmidTag = 'cmid:' + this.theme.annotationGuide.cmid
    tags.push(cmidTag)
    // PVSCL:ENDCOND
    let body = []
    if (this.theme) {
      body.push({ type: 'Theme', name: this.theme.name, id: this.theme.id })
    }
    return {
      id: this.id,
      group: this.theme.annotationGuide.annotationServer.getGroupId(),
      permissions: {
        read: ['group:' + this.theme.annotationGuide.annotationServer.getGroupId()]
      },
      body: body,
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: this.target, // TODO Check if discrepancy between target and URI values works well in Hypothes.is annotation server
      text: jsYaml.dump({ id: this.id || '', description: this.description }),
      uri: this.theme.annotationGuide.annotationServer.getGroupUrl()
    }
  }

  getTags () {
    return [Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + this.name, Config.namespace + ':' + Config.tags.grouped.relation + ':' + this.theme.name]
  }

  static fromAnnotations () {
    // TODO Xabi
  }

  static fromAnnotation (annotation, theme = {}) {
    // TODO Change use of tags to body
    const codeTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':' + Config.tags.grouped.subgroup + ':')
    })
    if (_.isString(codeTag)) {
      const name = codeTag.replace(Config.namespace + ':' + Config.tags.grouped.subgroup + ':', '')
      const config = jsYaml.load(annotation.text)
      if (_.isObject(config)) {
        const description = config.description
        const id = annotation.id
        let codeToReturn
        // PVSCL:IFCOND(MoodleProvider, LINE)
        const moodleLevelId = config.id
        codeToReturn = new Code({ id, name, description, theme, moodleLevelId, createdDate: annotation.created, updatedDate: annotation.updated, target: annotation.target })
        // PVSCL:ELSECOND
        codeToReturn = new Code({ id, name, description, theme, createdDate: annotation.created, updatedDate: annotation.updated, target: annotation.target })
        // PVSCL:ENDCOND
        return codeToReturn
      } else {
        console.error('Unable to retrieve code configuration from annotation')
      }
    } else {
      console.error('Unable to retrieve code from annotation')
    }
  }

  toObject () {
    return {
      name: this.name,
      description: this.description,
      id: this.id,
      theme: this.theme.toObject()
    }
  }
  // PVSCL:IFCOND(MoodleProvider, LINE)

  static createCodeFromObject (code, theme) {
    // Instance level object
    const instancedCode = Object.assign(new Code({}), code)
    instancedCode.theme = theme
    return instancedCode
  }
  // PVSCL:ENDCOND
}

export default Code
