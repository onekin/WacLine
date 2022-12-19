import jsYaml from 'js-yaml'
import _ from 'lodash'
import Config from '../../Config'
// PVSCL:IFCOND(CodebookUpdate, LINE)
import ColorUtils from '../../utils/ColorUtils'
// PVSCL:ENDCOND
import LanguageUtils from '../../utils/LanguageUtils'
import Theme from './Theme'

class Dimension {
  constructor ({
    id,
    name,
    color,
    description,
    annotationGuide,
    createdDate = new Date()
  }) {
    this.id = id
    this.name = name
    this.color = color
    this.themes = []
    this.description = description
    this.annotationGuide = annotationGuide
    if (LanguageUtils.isInstanceOf(createdDate, Date)) {
      this.createdDate = createdDate
    } else {
      const timestamp = Date.parse(createdDate)
      if (_.isNumber(timestamp)) {
        this.createdDate = new Date(createdDate)
      }
    }
  }

  static fromAnnotation (annotation, annotationGuide = {}) {
    const dimensionTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':dimension:')
    })
    if (_.isString(dimensionTag)) {
      const name = dimensionTag.replace(Config.namespace + ':dimension:', '')
      const config = jsYaml.load(annotation.text)
      if (_.isObject(config)) {
        const description = config.description
        const color = config.color
        const id = annotation.id
        return new Dimension({
          id,
          name,
          description,
          color,
          createdDate: annotation.updated,
          annotationGuide
        })
      } else {
        console.error('Unable to retrieve configuration for annotation')
      }
    } else {
      console.error('Unable to retrieve criteria from annotation')
    }
  }

  toAnnotation () {
    const dimensionTag = Config.namespace + ':' + 'dimension' + ':' + this.name
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    const tags = [dimensionTag, motivationTag]
    return {
      id: this.id,
      group: this.annotationGuide.annotationServer.group.id,
      permissions: {
        read: ['group:' + this.annotationGuide.annotationServer.getGroupId()]
      },
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: [],
      text: jsYaml.dump({
        id: this.id,
        description: this.description,
        color: this.color
      }),
      uri: this.annotationGuide.annotationServer.getGroupUrl()
    }
  }

  addTheme (theme) {
    this.themes.push(theme)
  }

  updateTheme (theme, previousId) {
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      // Find item index using _.findIndex
      const index = _.findIndex(this.themes, (it) => {
        return it.id === theme.id || it.id === previousId
      })
      this.themes.splice(index, 1, theme)
    }
  }

  removeTheme (theme) {
    _.remove(this.themes, theme)
  }
}

export default Dimension
