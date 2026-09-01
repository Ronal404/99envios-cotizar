const logger = require('../utils/logger');

function apiKeyAuth(req, res, next) {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return next();
  }

  const requestApiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!requestApiKey) {
    logger.warn('API request without API key', {
      ip: req.ip,
      path: req.path
    });

    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'API key is required. Provide it in X-API-Key header or apiKey query parameter'
    });
  }

  if (requestApiKey !== apiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path
    });

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }

  logger.debug('Valid API key', { path: req.path });
  next();
}

module.exports = apiKeyAuth;
