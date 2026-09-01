const quoteService = require('../services/quote.service')
const { resolveCity } = require('../utils/cities')
const logger = require('../utils/logger')

class QuoteController {
  async getQuote(req, res) {
    try {
      const useCache = req.body.useCache !== false
      const result = await quoteService.getQuote(req.body, useCache)
      return res.json(result)
    } catch (error) {
      logger.error('Error in getQuote controller', { error: error.message })
      const status = error.status || 500
      return res.status(status).json({
        success: false,
        error: status === 500 ? 'Failed to get shipping quote' : error.message,
        message: error.message,
        matches: error.matches || undefined
      })
    }
  }

  async getCities(req, res) {
    try {
      const query = req.query.q || req.query.query || req.query.search || ''
      const limit = parseInt(req.query.limit, 10) || 20
      const result = quoteService.getCities(query, Math.min(limit, 200))
      return res.json(result)
    } catch (error) {
      logger.error('Error in getCities controller', { error: error.message })
      return res.status(500).json({
        success: false,
        error: 'Failed to list cities',
        message: error.message
      })
    }
  }

  async getEffectiveness(req, res) {
    try {
      const city = resolveCity(req.params.city || req.query.q)
      if (!city) {
        return res.status(400).json({
          success: false,
          error: 'Ciudad requerida. Usa código DANE o nombre, por ejemplo MEDELLIN o 05001000'
        })
      }

      const effectiveness = await quoteService.getCityEffectiveness(city.code)
      return res.json({
        success: true,
        city,
        data: effectiveness
      })
    } catch (error) {
      logger.error('Error in getEffectiveness controller', { error: error.message })
      const status = error.status || 500
      return res.status(status).json({
        success: false,
        error: error.message,
        matches: error.matches || undefined
      })
    }
  }
}

module.exports = new QuoteController()
