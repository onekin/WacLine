const Body = require('./Body')
// PVSCL:IFCOND(Hierarchy, LINE)
const Code = require('../../definition/Code')
// PVSCL:ENDCOND
const Theme = require('../../definition/Theme')
const LanguageUtils = require('../../utils/LanguageUtils')
const _ = require('lodash')

class Classifying extends Body {
  constructor ({purpose = 'classifying', code}) {
    super(purpose)
    if (!_.isEmpty(code)) {
      if (/* PVSCL:IFCOND(Hierarchy) */LanguageUtils.isInstanceOf(code, Code) || /* PVSCL:ENDCOND */LanguageUtils.isInstanceOf(code, Theme)) {
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
    let code = window.abwa.tagManager.model.highlighterDefinition.getCodeOrThemeFromId(this.value.id)
    // PVSCL:IFCOND(Hierarchy, LINE)
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
