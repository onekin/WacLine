const Body = require('./Body')
const Code = require('../../definition/Code')
const Theme = require('../../definition/Theme')
const LanguageUtils = require('../../utils/LanguageUtils')
const _ = require('lodash')

class Classifying extends Body {
  constructor ({purpose = 'classifying', code}) {
    super(purpose)
    if (!_.isEmpty(code)) {
      if (LanguageUtils.isInstanceOf(code, Code) || LanguageUtils.isInstanceOf(code, Theme)) {
        this.value = code.toObject()
      } else {
        this.value = code
      }
    } else {
      throw new Error('Body with classifying purpose must contain a code or theme')
    }
  }

  populate (code) {
    super.populate(code)
  }

  serialize () {
    return super.serialize()
  }

  static deserialize (obj) {
    let code = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(obj.id)
    return new Classifying({code})
  }

  tooltip () {
    let tooltip = ''
    // PVSCL:IFCOND(Hierarchy, LINE)
    // TODO
    let code = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(this.value.id)
    if (LanguageUtils.isInstanceOf(code, Code)) {
      tooltip += 'Code: ' + code.name + 'for Theme: ' + code.theme.name
    } else {
      tooltip += 'Theme: ' + code.name
    }
    // PVSCL:ELSECOND
    tooltip += 'Theme: ' + code.name
    // PVSCL:ENDCOND
    return tooltip
  }
}

module.exports = Classifying
