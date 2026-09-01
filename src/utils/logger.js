const chalk = require('chalk')
const config = require('../config')

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
}

const colors = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.blue,
  debug: chalk.gray
}

const icons = {
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🔍'
}

class Logger {
  constructor() {
    this.level = levels[config.logging.level] || levels.info
  }

  log(level, message, data = null) {
    if (levels[level] > this.level) {
      return
    }

    const timestamp = new Date().toISOString()
    const color = colors[level] || chalk.white
    const icon = icons[level] || ''
    console.log(`${chalk.gray(timestamp)} ${icon} ${color(level.toUpperCase())}: ${message}`)

    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)))
    }
  }

  error(message, data = null) {
    this.log('error', message, data)
  }

  warn(message, data = null) {
    this.log('warn', message, data)
  }

  info(message, data = null) {
    this.log('info', message, data)
  }

  debug(message, data = null) {
    this.log('debug', message, data)
  }

  success(message, data = null) {
    const timestamp = new Date().toISOString()
    console.log(`${chalk.gray(timestamp)} ✅ ${chalk.green('SUCCESS')}: ${message}`)
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)))
    }
  }
}

module.exports = new Logger()
