const NodeCache = require('node-cache')
const config = require('../config')
const logger = require('./logger')

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.ttl / 1000,
      checkperiod: config.cache.checkPeriod,
      useClones: false
    })

    this.cache.on('expired', (key) => {
      logger.debug(`Cache expired for key: ${key}`)
    })

    logger.info('Cache service initialized', {
      ttl: `${config.cache.ttl / 1000}s`,
      checkPeriod: `${config.cache.checkPeriod}s`
    })
  }

  get(key) {
    const value = this.cache.get(key)
    if (value) {
      logger.debug(`Cache hit for key: ${key}`)
      return value
    }
    logger.debug(`Cache miss for key: ${key}`)
    return null
  }

  set(key, value, ttl = null) {
    const success = this.cache.set(key, value, ttl ? ttl / 1000 : undefined)
    if (success) {
      logger.debug(`Cache set for key: ${key}`)
    }
    return success
  }

  del(key) {
    return this.cache.del(key)
  }

  flush() {
    this.cache.flushAll()
    logger.info('Cache flushed')
  }

  getStats() {
    return this.cache.getStats()
  }
}

module.exports = new CacheService()
