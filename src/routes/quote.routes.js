const express = require('express')
const router = express.Router()
const quoteController = require('../controllers/quote.controller')

router.post('/quote', quoteController.getQuote.bind(quoteController))
router.get('/quote/cities', quoteController.getCities.bind(quoteController))
router.get('/quote/effectiveness/:city', quoteController.getEffectiveness.bind(quoteController))

module.exports = router
