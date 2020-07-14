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
    color,
    theme/* PVSCL:IFCOND(MoodleProvider) */,
    moodleLevelId/* PVSCL:ENDCOND *//* PVSCL:IFCOND(PublicPrivate) */,
    publicPrivate/* PVSCL:ENDCOND */
  }) {
    this.id = id
    this.name = name
    this.color = color
    this.theme = theme
    this.description = description
    // PVSCL:IFCOND(PublicPrivate, LINE)
    this.publicPrivate = publicPrivate
    // PVSCL:ENDCOND
    if (LanguageUtils.isInstanceOf(createdDate, Date)) {
      this.createdDate = createdDate
    } else {
      const timestamp = Date.parse(createdDate)
      if (_.isNumber(timestamp)) {
        this.createdDate = new Date(createdDate)
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
    return {
      id: this.id,
      group: this.theme.annotationGuide.annotationServer.group.id,
      permissions: {
        read: ['group:' + this.theme.annotationGuide.annotationServer.group.id]
      },
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: [],
      // PVSCL:IFCOND(PublicPrivate, LINE)
      publicPrivate: this.publicPrivate,
      // PVSCL:ENDCOND
      text: jsYaml.dump({ id: this.id || '', description: this.description }),
      uri: this.theme.annotationGuide.annotationServer.group.links.html
    }
  }

  getTags () {
    let tags = [Config.namespace + ':' + Config.tags.grouped.subgroup + ':' + this.name, Config.namespace + ':' + Config.tags.grouped.relation + ':' + this.theme.name/* PVSCL:IFCOND(PublicPrivate) */, Config.namespace + ':isPublic:' + this.publicPrivate/* PVSCL:ENDCOND */]
    return tags
  }

  static fromAnnotations () {
    // TODO Xabi
  }

  static fromAnnotation (annotation, theme = {}) {
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
        codeToReturn = new Code({ id, name, description, theme, moodleLevelId, createdDate: annotation.updated/* PVSCL:IFCOND(PublicPrivate) */, publicPrivate: annotation.publicPrivate/* PVSCL:ENDCOND */ })
        // PVSCL:ELSECOND
        codeToReturn = new Code({ id, name, description, theme, createdDate: annotation.updated/* PVSCL:IFCOND(PublicPrivate) */, publicPrivate: annotation.publicPrivate/* PVSCL:ENDCOND */ })
        // PVSCL:ENDCOND
        return codeToReturn
      } else {
        console.error('Unable to retrieve mark configuration from annotation')
      }
    } else {
      console.error('Unable to retrieve mark from annotation')
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
