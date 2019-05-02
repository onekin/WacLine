const _ = require('lodash')
const $ = require('jquery')
const jsYaml = require('js-yaml')
const ModeManager = require('./ModeManager')
const LanguageUtils = require('../utils/LanguageUtils')
const ColorUtils = require('../utils/ColorUtils')
const Events = require('./Events')

class Tag {
  constructor (config) {
    this.name = config.name
    this.namespace = config.namespace
    this.tags = config.tags || [config.namespace + ':' + config.name]
    if (config.options && config.options.color) {
      if (!ColorUtils.hasAlpha(config.options.color)) {
        this.color = ColorUtils.setAlphaToColor(config.options.color, 0.5) // Set a 0.5 alpha to all colors without alpha
      } else {
        this.color = config.options.color
      }
    } else {
      this.color = ColorUtils.getHashColor(this.name)
    }
    this.options = config.options
  }

  createButton () {
    let tagButtonTemplate = document.querySelector('#tagButtonTemplate')
    this.tagButton = $(tagButtonTemplate.content.firstElementChild).clone().get(0)
    this.tagButton.innerText = this.name
    this.tagButton.title = this.name
    for (let key in this.options) {
      this.tagButton.dataset[key] = this.options[key]
    }
    this.tagButton.dataset.tags = this.tags
    this.tagButton.setAttribute('role', 'annotation')
    if (this.color) {
      $(this.tagButton).css('background-color', this.color)
    }
    // Set handler for button
    this.tagButton.addEventListener('click', (event) => {
      if (event.target.getAttribute('role') === Tag.roles.annotation) {
        LanguageUtils.dispatchCustomEvent(Events.annotate, {tags: this.tags})
      } else if (event.target.getAttribute('role') === Tag.roles.index) {
        window.abwa.contentAnnotator.goToFirstAnnotationOfTag({tags: this.tags})
      }
    })
    return this.tagButton
  }
}

Tag.roles = {
  annotation: 'annotation',
  index: 'index'
}

class TagGroup {
  constructor (config, tags) {
    this.config = config
    this.tags = tags || []
  }

  createPanel (indexRole) {
    if (this.tags.length > 0) {
      let tagGroupTemplate = document.querySelector('#tagGroupTemplate')
      let tagGroup = $(tagGroupTemplate.content.firstElementChild).clone().get(0)
      let tagButtonContainer = $(tagGroup).find('.tagButtonContainer')
      let groupNameSpan = tagGroup.querySelector('.groupName')
      groupNameSpan.innerText = this.config.name
      groupNameSpan.title = this.config.name
      for (let j = 0; j < this.tags.length; j++) {
        let tagButton = this.tags[j].createButton()
        if (indexRole) {
          tagButton.setAttribute('role', Tag.roles.index)
        }
        tagButtonContainer.append(tagButton)
      }
      return tagGroup
    }
  }
}

class TagManager {
  constructor (namespace, config) {
    this.model = {
      documentAnnotations: [],
      groupAnnotations: [],
      namespace: namespace,
      config: config
    }
    this.currentTags = []
    this.currentIndexTags = []
    this.events = {}
  }

  init (callback) {
    this.initTagsStructure(() => {
      this.initEventHandlers(() => {
        this.initAllTags(() => {
          if (window.abwa.modeManager.mode === ModeManager.modes.highlight) {
            this.showAllTagsContainer()
          } else {
            this.showIndexTagsContainer()
          }
          if (_.isFunction(callback)) {
            callback()
          }
        })
      })
    })
  }

  getGroupAnnotations (callback) {
    window.abwa.hypothesisClientManager.hypothesisClient.searchAnnotations({
      url: window.abwa.groupSelector.currentGroup.url,
      order: 'desc'
    }, (err, annotations) => {
      if (err) {
        window.alert('Unable to retrieve document annotations') // TODO Swal
      } else {
        // Retrieve tags which has the namespace
        annotations = _.filter(annotations, (annotation) => {
          return this.hasANamespace(annotation, this.model.namespace)
        })
        // Remove slr:spreadsheet annotation ONLY for SLR case
        annotations = _.filter(annotations, (annotation) => {
          return !this.hasATag(annotation, 'slr:spreadsheet')
        })
        // Remove tags which are not group or subgroup
        if (_.isFunction(callback)) {
          callback(annotations)
        }
      }
    })
  }

  initTagsStructure (callback) {
    let tagWrapperUrl = chrome.extension.getURL('pages/sidebar/tagWrapper.html')
    $.get(tagWrapperUrl, (html) => {
      $('#abwaSidebarContainer').append($.parseHTML(html))
      this.tagsContainer = {annotate: document.querySelector('#tagsAnnotate'), index: document.querySelector('#tagsIndex')}
      if (this.model.namespace === 'exam') {
        // Hide the content of the tags sidebar until they are ordered
        this.tagsContainer.annotate.dataset.examHidden = 'true'
      }
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  getTagsList () {
    if (this.currentTags.length > 0) {
      if (LanguageUtils.isInstanceOf(this.currentTags[0], Tag)) {
        return this.currentTags
      } else if (LanguageUtils.isInstanceOf(this.currentTags[0], TagGroup)) {
        let tags = []
        for (let i = 0; i < this.currentTags.length; i++) {
          tags = tags.concat(this.currentTags[i].tags)
        }
        return tags
      }
    } else {
      return [] // No tags for current group
    }
  }

  static retrieveTagForAnnotation (annotation, tagList) {
    for (let i = 0; i < tagList.length; i++) {
      let difference = _.differenceWith(
        tagList[i].tags,
        annotation.tags,
        (tag1, tag2) => {
          return tag1.toLowerCase() === tag2.toLowerCase()
        })
      if (difference.length === 0) {
        return tagList[i]
      }
    }
  }

  initAllTags (callback) {
    this.getGroupAnnotations((annotations) => {
      // Add to model
      this.model.groupAnnotations = annotations
      // If annotations are grouped
      if (!_.isEmpty(this.model.config.grouped)) {
        this.currentTags = this.createTagsBasedOnAnnotationsGrouped(annotations, this.model.config.grouped)
      } else {
        // Create tags based on annotations
        this.currentTags = this.createTagsBasedOnAnnotations(annotations)
      }
      this.createTagButtons()
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  hasANamespace (annotation, namespace) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), (namespace + ':').toLowerCase())
    }) !== -1
  }

  hasATag (annotation, tag) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), tag.toLowerCase())
    }) !== -1
  }

  createTagsBasedOnAnnotations () {
    let tags = []
    for (let i = 0; i < this.model.groupAnnotations.length; i++) {
      let tagAnnotation = this.model.groupAnnotations[i]
      let tagName = tagAnnotation.tags[0].substr(this.model.namespace.length + 1) // <namespace>:
      tags.push(new Tag({name: tagName, namespace: this.model.namespace, options: jsYaml.load(tagAnnotation.text)}))
    }
    this.model.currentTags = tags
    return tags
  }

  createTagsBasedOnAnnotationsGrouped () {
    let tagGroupsAnnotations = {}
    for (let i = 0; i < this.model.groupAnnotations.length; i++) {
      let groupTag = this.retrieveTagNameByPrefix(this.model.groupAnnotations[i].tags, (this.model.namespace + ':' + this.model.config.grouped.group))
      if (groupTag) {
        tagGroupsAnnotations[groupTag] = new TagGroup({name: groupTag, namespace: this.model.namespace, group: this.model.config.grouped.group})
      }
    }
    let groups = _.sortBy(_.keys(tagGroupsAnnotations))
    let colorList = ColorUtils.getDifferentColors(groups.length)
    let colors = {}
    for (let i = 0; i < groups.length; i++) {
      colors[groups[i]] = colorList[i]
    }
    for (let i = 0; i < this.model.groupAnnotations.length; i++) {
      let tagAnnotation = this.model.groupAnnotations[i]
      let tagName = this.retrieveTagNameByPrefix(this.model.groupAnnotations[i].tags, (this.model.namespace + ':' + this.model.config.grouped.subgroup))
      let groupBelongedTo = this.retrieveTagNameByPrefix(this.model.groupAnnotations[i].tags, (this.model.namespace + ':' + this.model.config.grouped.relation))
      if (tagName && groupBelongedTo) {
        if (_.isArray(tagGroupsAnnotations[groupBelongedTo].tags)) {
          // Load options from annotation text body
          let options = jsYaml.load(tagAnnotation.text)
          tagGroupsAnnotations[groupBelongedTo].tags.push(new Tag({
            name: tagName,
            namespace: this.model.namespace,
            options: options || {},
            tags: [
              this.model.namespace + ':' + this.model.config.grouped.relation + ':' + groupBelongedTo,
              this.model.namespace + ':' + this.model.config.grouped.subgroup + ':' + tagName]
          }))
          this.model.currentTags = tagGroupsAnnotations
        }
      }
    }
    // Reorder the codes by name
    tagGroupsAnnotations = _.map(tagGroupsAnnotations, (tagGroup) => { tagGroup.tags = _.sortBy(tagGroup.tags, 'name'); return tagGroup })
    // Set color for each code
    tagGroupsAnnotations = _.map(tagGroupsAnnotations, (tagGroup) => {
      if (tagGroup.tags.length > 0) {
        tagGroup.tags = _.map(tagGroup.tags, (tag, index) => {
          let color = ColorUtils.setAlphaToColor(colors[tagGroup.config.name], 0.2 + index / tagGroup.tags.length * 0.8)
          tag.options.color = color
          tag.color = color
          return tag
        })
      }
      return tagGroup
    })
    // For groups without sub elements
    let emptyGroups = _.filter(tagGroupsAnnotations, (group) => { return group.tags.length === 0 })
    for (let j = 0; j < emptyGroups.length; j++) {
      let options = {color: ColorUtils.setAlphaToColor(colors[emptyGroups[j].config.name], 0.5)}
      let index = _.findIndex(tagGroupsAnnotations, (tagGroup) => { return tagGroup.config.name === emptyGroups[j].config.name })
      if (index >= 0) {
        tagGroupsAnnotations[index].tags.push(new Tag({
          name: emptyGroups[j].config.name,
          namespace: emptyGroups[j].namespace,
          options: options,
          tags: [emptyGroups[j].config.namespace + ':' + emptyGroups[j].config.group + ':' + emptyGroups[j].config.name]
        }))
      }
    }
    // Hash to array
    return _.sortBy(tagGroupsAnnotations, 'config.name')
  }

  destroy () {
    // Remove event listeners
    let events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Remove tags wrapper
    $('#tagsWrapper').remove()
  }

  retrieveTagNameByPrefix (annotationTags, prefix) {
    for (let i = 0; i < annotationTags.length; i++) {
      if (_.startsWith(annotationTags[i].toLowerCase(), prefix.toLowerCase())) {
        return _.replace(annotationTags[i], prefix + ':', '')
      }
    }
    return null
  }

  createTagButtons (callback) {
    // If it is an array is not grouped
    if (this.currentTags.length > 0) {
      if (LanguageUtils.isInstanceOf(this.currentTags[0], Tag)) {
        for (let i = 0; i < this.currentTags.length; i++) {
          // Append each element
          let tagButton = this.currentTags[i].createButton()
          this.tagsContainer.annotate.append(tagButton)
        }
      } else if (LanguageUtils.isInstanceOf(this.currentTags[0], TagGroup)) {
        for (let i = 0; i < this.currentTags.length; i++) {
          let tagGroupElement = this.currentTags[i].createPanel()
          if (tagGroupElement) {
            this.tagsContainer.annotate.append(tagGroupElement)
          }
        }
      }
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initEventHandlers (callback) {
    // For mode change
    this.events.modeChange = {element: document, event: Events.modeChanged, handler: (event) => { this.modeChangeHandler(event) }}
    this.events.modeChange.element.addEventListener(this.events.modeChange.event, this.events.modeChange.handler, false)
    // For user filter change
    this.events.updatedCurrentAnnotationsEvent = {element: document, event: Events.updatedCurrentAnnotations, handler: this.createUpdatedCurrentAnnotationsEventHandler()}
    this.events.updatedCurrentAnnotationsEvent.element.addEventListener(this.events.updatedCurrentAnnotationsEvent.event, this.events.updatedCurrentAnnotationsEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createUpdatedCurrentAnnotationsEventHandler () {
    return (event) => {
      // Retrieve current annotations
      let currentAnnotations = event.detail.currentAnnotations
      // Update index tags menu
      this.updateIndexTags(currentAnnotations)
    }
  }

  updateIndexTags (currentAnnotations) {
    let tagsIndexContainer = document.querySelector('#tagsIndex')
    tagsIndexContainer.innerHTML = ''
    // Retrieve group annotations
    let groupAnnotations = this.model.groupAnnotations
    let groupTags = {}
    for (let i = 0; i < groupAnnotations.length; i++) {
      let groupTag = this.retrieveTagNameByPrefix(groupAnnotations[i].tags, (this.model.namespace + ':' + this.model.config.grouped.group))
      if (groupTag) {
        groupTags[groupTag] = new TagGroup({name: groupTag, namespace: this.model.namespace, group: this.model.config.grouped.group})
      }
    }
    // Retrieve tags of the namespace
    let documentAnnotations = _.filter(currentAnnotations, (annotation) => {
      return this.hasANamespace(annotation, this.model.namespace)
    })
    // Group active subgroups by groups
    for (let i = 0; i < documentAnnotations.length; i++) {
      let annotationGroupData = this.getGroupAndSubgroup(documentAnnotations[i])
      // If not already subgroup, define it
      if (!_.find(groupTags[annotationGroupData.group].tags, (tag) => { return tag.name === annotationGroupData.subgroup })) {
        // Create tag and add to its group
        // If has subgroup
        if (annotationGroupData.subgroup) {
          let tagName = annotationGroupData.subgroup
          let tagGroup = _.find(window.abwa.tagManager.model.currentTags, (groupTag) => { return groupTag.config.name === annotationGroupData.group })
          let tag = _.find(tagGroup.tags, (tag) => { return tag.name === annotationGroupData.subgroup })
          if (_.has(tag, 'color')) {
            groupTags[annotationGroupData.group].tags.push(new Tag({
              name: tagName,
              namespace: this.model.namespace,
              options: {color: tag.color},
              tags: [
                this.model.namespace + ':' + this.model.config.grouped.relation + ':' + annotationGroupData.group,
                this.model.namespace + ':' + this.model.config.grouped.subgroup + ':' + annotationGroupData.subgroup
              ]
            }))
          } else {
            console.error('Error parsing tags in sidebar') // TODO Show user
          }
        } else { // If doesn't have subgroup (free category)
          let tagName = annotationGroupData.group
          let color = _.find(window.abwa.tagManager.getTagsList(), (tag) => { return tag.name === tagName }).color
          if (groupTags[annotationGroupData.group].tags.length === 0) {
            groupTags[annotationGroupData.group].tags.push(new Tag({
              name: tagName,
              namespace: this.model.namespace,
              options: {color: color},
              tags: [
                this.model.namespace + ':' + this.model.config.grouped.group + ':' + tagName
              ]
            }))
          }
        }
      }
    }
    // Order code for each group
    groupTags = _.map(groupTags, (tagGroup) => { tagGroup.tags = _.sortBy(tagGroup.tags, 'name'); return tagGroup })
    // Order the groups
    this.currentIndexTags = _.sortBy(groupTags, 'config.name')
    // Generate tag groups and buttons
    this.createIndexTagsButtons()
  }

  modeChangeHandler (event) {
    if (event.detail.mode === ModeManager.modes.highlight) {
      // Show all the tags
      this.showAllTagsContainer()
    } else if (event.detail.mode === ModeManager.modes.index) {
      // TODO Update index tags (it is not really required because everytime user create/delete annotation is updated)
      this.showIndexTagsContainer()
    }
  }

  createIndexTagsButtons (callback) {
    // If it is a non empty array, add buttons
    if (this.currentIndexTags.length > 0) {
      if (LanguageUtils.isInstanceOf(this.currentIndexTags[0], Tag)) {
        for (let i = 0; i < this.currentIndexTags.length; i++) {
          // Append each element
          let tagButton = this.currentIndexTags[i].createButton()
          tagButton.setAttribute('role', Tag.roles.index) // Set index rol to tag
          this.tagsContainer.index.append(tagButton)
        }
      } else if (LanguageUtils.isInstanceOf(this.currentIndexTags[0], TagGroup)) {
        for (let i = 0; i < this.currentIndexTags.length; i++) {
          let tagGroupElement = this.currentIndexTags[i].createPanel(true) // Index tag buttons panel
          if (tagGroupElement) {
            this.tagsContainer.index.append(tagGroupElement)
          }
        }
      }
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }

  getGroupAndSubgroup (annotation) {
    let tags = annotation.tags
    let group = null
    let subGroup = null
    let groupOf = _.find(tags, (tag) => { return _.startsWith(tag, this.model.namespace + ':' + this.model.config.grouped.relation + ':') })
    if (groupOf) {
      subGroup = _.find(tags, (tag) => { return _.startsWith(tag, this.model.namespace + ':' + this.model.config.grouped.subgroup + ':') })
        .replace(this.model.namespace + ':' + this.model.config.grouped.subgroup + ':', '')
      group = groupOf.replace(this.model.namespace + ':' + this.model.config.grouped.relation + ':', '')
    } else {
      let groupTag = _.find(tags, (tag) => { return _.startsWith(tag, this.model.namespace + ':' + this.model.config.grouped.group + ':') })
      if (groupTag) {
        group = groupTag.replace(this.model.namespace + ':' + this.model.config.grouped.group + ':', '')
      }
    }
    return {group: group, subgroup: subGroup}
  }

  showAllTagsContainer () {
    $(this.tagsContainer.index).attr('aria-hidden', 'true')
    $(this.tagsContainer.annotate).attr('aria-hidden', 'false')
  }

  showIndexTagsContainer () {
    $(this.tagsContainer.index).attr('aria-hidden', 'false')
    $(this.tagsContainer.annotate).attr('aria-hidden', 'true')
  }
}

module.exports = TagManager
