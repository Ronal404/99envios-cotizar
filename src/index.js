require('dotenv').config()
const express = require('express')
const cors = require('cors')
const config = require('./config')
const logger = require('./utils/logger')
const cache = require('./utils/cache')
const quoteRoutes = require('./routes/quote.routes')
const requestLogger = require('./middleware/logger.middleware')
const errorHandler = require('./middleware/error.middleware')
const apiKeyAuth = require('./middleware/auth.middleware')

const app = express()

app.set('trust proxy', 1)

app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(requestLogger)
app.use('/api', apiKeyAuth)
app.use('/api', quoteRoutes)

app.get('/', (req, res) => {
  res.json({
    name: '99 Envíos Cotizar API',
    version: '1.1.0',
    status: 'operational',
    description: 'API REST que replica el cotizador público de 99envios.app/cotizar',
    source: 'https://99envios.app/cotizar',
    endpoints: [
      {
        method: 'POST',
        path: '/api/quote',
        description: 'Cotiza un envío contra varias transportadoras',
        body: {
          destinationCity: 'string (requerido, código DANE o nombre)',
          originCity: 'string (opcional)',
          weight: 'number kg',
          length: 'number cm',
          width: 'number cm',
          height: 'number cm',
          declaredValue: 'number COP',
          deliveryType: 'direccion | oficina | veredas',
          cashOnDelivery: 'boolean (default: true)',
          insurance: 'none | antidevolucion | plus (default: none)',
          antiReturnInsurance: 'boolean (alias de insurance=antidevolucion)',
          antiReturnInsurancePlus: 'boolean (alias de insurance=plus)',
          useCache: 'boolean (default: true)'
        }
      },
      {
        method: 'GET',
        path: '/api/quote/cities?q=medellin',
        description: 'Busca ciudades DANE del cotizador'
      },
      {
        method: 'GET',
        path: '/api/quote/offices/:city',
        description: 'Oficinas Interrápidísimo de la ciudad (no cambia la cotización)'
      },
      {
        method: 'GET',
        path: '/api/quote/effectiveness/:city',
        description: 'Efectividad histórica por transportadora'
      },
      {
        method: 'GET',
        path: '/api/health',
        description: 'Estado del servidor'
      },
      {
        method: 'GET',
        path: '/api/cache/stats',
        description: 'Estadísticas del caché'
      },
      {
        method: 'POST',
        path: '/api/cache/clear',
        description: 'Limpia el caché'
      }
    ],
    timestamp: new Date().toISOString()
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    quoting: '99envios-public (integration1)',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

app.get('/api/cache/stats', (req, res) => {
  res.json({
    success: true,
    stats: cache.getStats()
  })
})

app.post('/api/cache/clear', (req, res) => {
  cache.flush()
  res.json({
    success: true,
    message: 'Cache cleared'
  })
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    availableEndpoints: [
      'POST /api/quote',
      'GET /api/quote/cities',
      'GET /api/quote/offices/:city',
      'GET /api/quote/effectiveness/:city',
      'GET /api/health'
    ]
  })
})

app.use(errorHandler)

function startServer() {
  app.listen(config.port, () => {
    logger.success(`Server running on port ${config.port}`)
    logger.info(`Environment: ${config.nodeEnv}`)
    logger.info(`Cache TTL: ${config.cache.ttl / 1000}s`)
    logger.info(`Upstream: ${config.envios99.integrationBaseUrl}`)
    logger.info(`API URL: http://localhost:${config.port}`)
    logger.info(`Health: http://localhost:${config.port}/api/health`)
  })
}

if (require.main === module) {
  startServer()
}

module.exports = app
