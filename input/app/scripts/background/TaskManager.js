const CircularJSON = require('circular-json-es6')
const ChromeStorage = require('../utils/ChromeStorage')
const CreateHighlighterTask = require('./tasks/CreateHighlighterTask')
const _ = require('lodash')

class TaskManager {
  constructor () {
    this.currentTasks = []
    this.currentTask = {}
    this.currentTaskInstance = null
  }

  init () {
    // TODO Init background listener for background tasks
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'task') {
        if (request.cmd === 'createHighlighters') {
          if (request.data) {
            let rubric = CircularJSON.parse(request.data.rubric)
            let students = request.data.students
            let courseId = request.data.courseId
            let task = this.prepareCreateHighlightersTask(rubric, students, courseId)
            let numberOfAnnotationsToCreate = task.activities.length * (_.reduce(_.map(rubric.guideElements, (guideElement) => { return guideElement.levels.length }), (sum, n) => { return sum + n }) + 2)
            let minutesPending = Math.round(numberOfAnnotationsToCreate / 60)
            this.addTasks(task)
            sendResponse({minutes: minutesPending})
          }
        } else if (request.cmd === 'getCurrentTaskStatus') {
          if (_.isObject(this.currentTaskInstance)) {
            sendResponse({status: 'CreateHighlighterTask pending', statusMessage: this.currentTaskInstance.getStatus()})
          } else {
            sendResponse({status: 'Nothing pending'})
          }
        }
      }
    })
    // Restore previous activities
    this.restoreTasks(() => {
      console.log('Task manager initialized')
      // Start task management
      this.checkTask()
    })
  }

  addTasks (task) {
    console.debug('Added new task ' + task.task + ' with id: ' + task.id)
    // Add to current tasks
    this.currentTasks.push(task)
    // Save current tasks
    this.saveTasks()
  }

  saveTasks () {
    ChromeStorage.setData('tasks', this.currentTasks, ChromeStorage.local, () => {

    })
  }

  restoreTasks (callback) {
    // Restore pending tasks
    ChromeStorage.getData('tasks', ChromeStorage.local, (err, tasks) => {
      if (err) {
        this.currentTasks = []
      } else {
        this.currentTasks = tasks || []
      }
      this.currentTask = {}
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  removeFinishedTask () {
    _.remove(this.currentTasks, (task) => {
      return task.id === this.currentTask.id
    })
    this.currentTask = {}
    // Save current tasks
    this.saveTasks()
  }

  doTask (todoTask) {
    this.currentTask = todoTask
    if (this.currentTask.task === 'createHighlighters') {
      let currentTask = this.currentTask
      // Create notification handler for task
      let buttonClickListener = (notificationId, buttonIndex) => {
        // TODO If notification id is the current one for this task
        if (buttonIndex === 0) {
          if (_.isFunction(currentTask.notificationHandler)) {
            currentTask.notificationHandler()
          }
        }
        // Remove notification listener
        chrome.notifications.onButtonClicked.removeListener(buttonClickListener)
      }
      chrome.notifications.onButtonClicked.addListener(buttonClickListener)
      // Create task
      let task = new CreateHighlighterTask(this.currentTask)
      task.init(() => {
        // Task is finished
        this.notifyTask(this.currentTask.notification)
        this.removeFinishedTask()
        this.currentTaskInstance = null
      })
      this.currentTaskInstance = task
    }
  }

  checkTask () {
    this.taskTimeout = setTimeout(() => {
      if (this.currentTasks.length > 0) {
        if (_.isEmpty(this.currentTask)) {
          let todoTask = this.currentTasks[0]
          this.doTask(todoTask)
          this.checkTask()
        } else {
          this.checkTask()
        }
      } else {
        this.checkTask()
      }
    }, 1000)
  }

  notifyTask (notification) {
    // Notify task is finished
    chrome.notifications.create('task' + this.currentTask.id, {
      type: 'basic',
      title: 'Configuration done',
      message: notification,
      iconUrl: chrome.extension.getURL('images/icon-512.png'),
      buttons: [
        {title: 'Yes'}]
    }, () => {
      console.debug('Notification send to user, task is finished')
    })
  }

  prepareCreateHighlightersTask (rubric, students, courseId) {
    let activities = []
    for (let i = 0; i < students.length; i++) {
      activities.push({
        'type': 'createHighlighter',
        'data': {student: students[i], rubric, courseId}
      })
    }
    return {
      id: Math.random(),
      task: 'createHighlighters',
      activities: activities,
      notification: 'The tool is prepared to mark ' + rubric.name + ' assignment. Would you like to mark them now?',
      notificationHandler: () => {
        chrome.tabs.create({url: rubric.moodleEndpoint + 'mod/assign/view.php?id=' + rubric.cmid})
      }
    }
  }
}

TaskManager.tasks = {
  'createHighlighters': (data, callback) => {

  }
}

module.exports = TaskManager
