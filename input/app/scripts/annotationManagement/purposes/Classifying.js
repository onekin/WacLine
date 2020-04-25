const Body = require('./Body')
// PVSCL:IFCOND(Hierarchy, LINE)
const Code = require('../../codebook/model/Code')
// PVSCL:ENDCOND
const Theme = require('../../codebook/model/Theme')
const LanguageUtils = require('../../utils/LanguageUtils')
const _ = require('lodash')
const Config = require('../../Config')

class Classifying extends Body {
  constructor ({purpose = Classifying.purpose, value}) {
    super(purpose)
    if (!_.isEmpty(value.code)) {
      if (/* PVSCL:IFCOND(Hierarchy) */LanguageUtils.isInstanceOf(value.code, Code) || /* PVSCL:ENDCOND */LanguageUtils.isInstanceOf(value.code, Theme)) {
        // PVSCL:IFCOND(EvidenceAnnotations, LINE)
        this.value = {code: value.code.toObject()/* PVSCL:IFCOND(EvidenceAnnotations) */, addToCXL: value.addToCXL/* PVSCL:ENDCOND */}
        // PVSCL:ELSECOND
        this.value = {code: value.code.toObject()}
        // PVSCL:ENDCOND
      } else {
        // PVSCL:IFCOND(EvidenceAnnotations, LINE)
        this.value = {code: value.code/* PVSCL:IFCOND(EvidenceAnnotations) */, addToCXL: value.addToCXL/* PVSCL:ENDCOND */}
        // PVSCL:ELSECOND
        this.value = {code: value.code}
        // PVSCL:ENDCOND
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
    let value = {}
    value.code = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(obj.code.id)
    // PVSCL:IFCOND(EvidenceAnnotations, LINE)
    value.addToCXL = obj.addToCXL
    // PVSCL:ENDCOND
    return new Classifying({value})
  }

  tooltip () {
    let tooltip = ''
    let code = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(this.value.code.id)
    // PVSCL:IFCOND(Hierarchy, LINE)
    if (LanguageUtils.isInstanceOf(code, Code)) {
      tooltip += 'Code: ' + code.name + ' for ' + Config.tags.grouped.group + ': ' + code.theme.name
    } else {
      if (code) {
        tooltip += Config.tags.grouped.group.toString().trim().replace(/^\w/, c => c.toUpperCase()) + ': ' + code.name
      } else {
        tooltip += 'Deleted theme or code: ' + this.value.code.name
      }
    }
    // PVSCL:ELSECOND
    if (code) {
      tooltip += Config.tags.grouped.group.toString().trim().replace(/^\w/, c => c.toUpperCase()) + ': ' + code.name
    } else {
      tooltip += 'Deleted ' + Config.tags.grouped.group + ': ' + this.value.code.name
    }
    // PVSCL:ENDCOND
    return tooltip
  }
}

Classifying.purpose = 'classifying'

module.exports = Classifying
