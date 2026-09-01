require('dotenv').config()

const config = {
  port: process.env.PORT || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '900000'),
    checkPeriod: 60
  },
  envios99: {
    integrationBaseUrl: process.env.ENVIOS99_INTEGRATION_URL || 'https://integration1.99envios.app',
    quoteSucursalId: process.env.ENVIOS99_SUCURSAL_ID || '21119',
    origin: 'https://99envios.app',
    referer: 'https://99envios.app/cotizar',
    timeoutMs: parseInt(process.env.ENVIOS99_TIMEOUT_MS || '15000')
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
}

module.exports = config
