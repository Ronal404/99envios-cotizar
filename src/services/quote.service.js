const axios = require('axios')
const crypto = require('crypto')
const config = require('../config')
const logger = require('../utils/logger')
const cache = require('../utils/cache')
const { resolveCity, searchCities, listCities } = require('../utils/cities')

const CARRIER_ORDER = ['interrapidisimo', 'coordinadora', 'tcc', 'servientrega', 'envia']
const OFFICE_CARRIERS = new Set(['interrapidisimo', 'coordinadora'])
const VEREDA_CARRIERS = new Set(['interrapidisimo'])

const DELIVERY_TYPE_IDS = {
  direccion: 1,
  office: 2,
  oficina: 2,
  centroacopio: 2,
  'centro-acopio': 2,
  veredas: 3,
  vereda: 3
}

const SERVICE_TYPE_IDS = {
  normal: 1,
  paquete: 2
}

const INSURANCE_TYPES = {
  none: 'none',
  ninguno: 'none',
  no: 'none',
  antidevolucion: 'antidevolucion',
  'anti-devolucion': 'antidevolucion',
  antireturn: 'antidevolucion',
  'anti-return': 'antidevolucion',
  seguro99: 'antidevolucion',
  plus: 'plus',
  'antidevolucion-plus': 'plus',
  antidevolucionplus: 'plus',
  seguro99plus: 'plus'
}

class QuoteService {
  constructor() {
    this.client = axios.create({
      baseURL: config.envios99.integrationBaseUrl,
      timeout: config.envios99.timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: config.envios99.origin,
        Referer: config.envios99.referer,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
  }

  getCities(query, limit = 20) {
    if (!query) {
      return {
        success: true,
        count: listCities().length,
        cities: listCities()
      }
    }

    const cities = searchCities(query, limit)
    return {
      success: true,
      count: cities.length,
      cities
    }
  }

  calculateVolumetricWeight(lengthCm, widthCm, heightCm) {
    const volume = (Number(lengthCm) || 0) * (Number(widthCm) || 0) * (Number(heightCm) || 0)
    return Number((volume / 6000).toFixed(2))
  }

  calculateBillableWeight(grossWeightKg, volumetricWeightKg) {
    const gross = Number(grossWeightKg) || 0
    const volumetric = Number(volumetricWeightKg) || 0
    return Number(Math.max(gross, volumetric).toFixed(2))
  }

  minimumDeclaredValue(billableWeightKg) {
    if (billableWeightKg >= 6) return 50000
    if (billableWeightKg >= 3) return 40000
    return 25000
  }

  resolveDeliveryType(deliveryType) {
    const key = String(deliveryType || 'direccion')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
    const id = DELIVERY_TYPE_IDS[key]
    if (!id) {
      const error = new Error(
        'Tipo de entrega inválido. Usa direccion, oficina o veredas'
      )
      error.status = 400
      throw error
    }
    return {
      id,
      name: id === 1 ? 'direccion' : id === 2 ? 'oficina' : 'veredas'
    }
  }

  formatQuoteDate(date = new Date()) {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  buildCacheKey(payload) {
    const digest = crypto
      .createHash('sha1')
      .update(JSON.stringify(payload))
      .digest('hex')
    return `quote99:${digest}`
  }

  normalizeRequest(body) {
    const destinationInput = body.destinationCity || body.destino || body.destination
    const originInput = body.originCity || body.origen || body.origin

    if (!destinationInput) {
      const error = new Error('destinationCity es requerido (código DANE o nombre)')
      error.status = 400
      throw error
    }

    const destination = resolveCity(destinationInput)
    if (!destination) {
      const error = new Error(`No se encontró la ciudad destino: ${destinationInput}`)
      error.status = 400
      throw error
    }

    let origin = null
    if (originInput) {
      origin = resolveCity(originInput)
      if (!origin) {
        const error = new Error(`No se encontró la ciudad origen: ${originInput}`)
        error.status = 400
        throw error
      }
    }

    const length = Number(body.length || body.largo)
    const width = Number(body.width || body.ancho)
    const height = Number(body.height || body.alto)
    const grossWeight = Number(body.weight || body.peso || body.grossWeight)

    if (!Number.isFinite(grossWeight) || grossWeight <= 0) {
      const error = new Error('weight debe ser un número mayor a 0 (kg)')
      error.status = 400
      throw error
    }

    if (![length, width, height].every((value) => Number.isFinite(value) && value >= 1)) {
      const error = new Error('length, width y height deben ser números >= 1 (cm)')
      error.status = 400
      throw error
    }

    const volumetricWeight = this.calculateVolumetricWeight(length, width, height)
    const billableWeight = this.calculateBillableWeight(grossWeight, volumetricWeight)
    const declaredValue = Number(body.declaredValue || body.valorDeclarado)
    const minimumDeclared = this.minimumDeclaredValue(billableWeight)

    if (!Number.isFinite(declaredValue) || declaredValue < minimumDeclared) {
      const error = new Error(
        `declaredValue debe ser al menos ${minimumDeclared} para un peso facturable de ${billableWeight} kg`
      )
      error.status = 400
      throw error
    }

    const deliveryType = this.resolveDeliveryType(body.deliveryType || body.tipoEntrega)
    const cashOnDelivery = body.cashOnDelivery !== undefined
      ? Boolean(body.cashOnDelivery)
      : body.AplicaContrapago !== undefined
        ? Boolean(body.AplicaContrapago)
        : true

    const insurance = this.resolveInsurance(body)

    if (insurance !== 'none' && !cashOnDelivery) {
      const error = new Error('Los seguros antidevolución solo aplican con pago contra entrega')
      error.status = 400
      throw error
    }

    const serviceType = String(body.serviceType || body.shipmentType || 'paquete')
      .trim()
      .toLowerCase()
    const serviceId = SERVICE_TYPE_IDS[serviceType] || SERVICE_TYPE_IDS.paquete

    return {
      origin,
      destination,
      deliveryType,
      serviceId,
      serviceType: serviceId === 1 ? 'normal' : 'paquete',
      grossWeight,
      volumetricWeight,
      billableWeight,
      length: Math.round(length),
      width: Math.round(width),
      height: Math.round(height),
      declaredValue: Math.round(declaredValue),
      cashOnDelivery,
      insurance,
      antiReturnInsurance: insurance === 'antidevolucion',
      antiReturnInsurancePlus: insurance === 'plus'
    }
  }

  resolveInsurance(body) {
    if (body.insurance != null && body.insurance !== '') {
      if (body.insurance === true) {
        return 'antidevolucion'
      }
      if (body.insurance === false) {
        return 'none'
      }
      const key = String(body.insurance)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
      const type = INSURANCE_TYPES[key]
      if (!type) {
        const error = new Error(
          'insurance inválido. Usa none, antidevolucion o plus'
        )
        error.status = 400
        throw error
      }
      return type
    }

    if (body.antiReturnInsurancePlus === true || body.seguro99plus === true) {
      return 'plus'
    }
    if (body.antiReturnInsurance === true || body.seguro99 === true) {
      return 'antidevolucion'
    }
    return 'none'
  }

  buildUpstreamPayload(request) {
    return {
      destino: {
        nombre: request.destination.name || '',
        codigo: request.destination.code
      },
      origen: {
        nombre: request.origin ? request.origin.name : '',
        codigo: request.origin ? request.origin.code : ''
      },
      IdTipoEntrega: request.deliveryType.id,
      IdServicio: request.serviceId,
      peso: request.billableWeight,
      largo: request.length,
      ancho: request.width,
      alto: request.height,
      fecha: this.formatQuoteDate(),
      AplicaContrapago: request.cashOnDelivery,
      valorDeclarado: request.declaredValue,
      seguro99: request.antiReturnInsurance,
      seguro99plus: request.antiReturnInsurancePlus
    }
  }

  isCarrierSupported(carrier, deliveryTypeName) {
    if (deliveryTypeName === 'oficina') {
      return OFFICE_CARRIERS.has(carrier)
    }
    if (deliveryTypeName === 'veredas') {
      return VEREDA_CARRIERS.has(carrier)
    }
    return true
  }

  parseCarrierQuote(carrier, raw, request) {
    if (!raw || typeof raw !== 'object') {
      return null
    }

    const freight = Number(raw.valor || raw.flete || 0)
    const overfreight = Number(raw.sobreflete || 0)
    const cashOnDeliveryFee = Number(raw.valor_contrapago || 0)
    const rawInsurance = Number(raw.seguro99 || 0)
    const rawInsurancePlus = Number(raw.seguro99plus || 0)
    // El backend a veces mete el Plus en seguro99
    const insurance = request.insurance === 'antidevolucion' ? rawInsurance : 0
    const insurancePlus = request.insurance === 'plus'
      ? (rawInsurancePlus || rawInsurance)
      : 0
    const insuranceCost = insurance + insurancePlus
    const shippingCost = freight + overfreight + cashOnDeliveryFee + insuranceCost
    const profit = request.cashOnDelivery
      ? request.declaredValue - shippingCost
      : null

    return {
      carrier,
      available: raw.exito === true,
      supportedForDeliveryType: this.isCarrierSupported(carrier, request.deliveryType.name),
      message: raw.mensaje || null,
      freight,
      overfreight,
      cashOnDeliveryFee,
      insuranceType: request.insurance,
      insurance,
      insurancePlus,
      insuranceCost,
      shippingCost,
      youReceive: request.cashOnDelivery ? request.declaredValue : null,
      profit,
      deliveryDays: raw.dias != null ? String(raw.dias) : null,
      deliveryDate: raw.fecha_entrega || null,
      quoteId: raw.cotizacion_id || null,
      raw
    }
  }

  async getCityEffectiveness(cityCode) {
    try {
      const response = await this.client.get(
        `/api/ver-efectividad-ciudades/${cityCode}`
      )
      return response.data || null
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          ciudad: cityCode,
          message:
            (error.response.data && error.response.data.message) ||
            'No hay datos de efectividad para este municipio',
          transportadoras: {}
        }
      }
      logger.warn('No se pudo obtener efectividad de ciudad', {
        cityCode,
        error: error.message
      })
      return null
    }
  }

  attachEffectiveness(quotes, effectiveness) {
    const carriers = (effectiveness && effectiveness.transportadoras) || {}
    return quotes.map((quote) => {
      const key = Object.keys(carriers).find(
        (name) => name.toLowerCase() === quote.carrier
      )
      const rate = key && typeof carriers[key].efectividad === 'number'
        ? carriers[key].efectividad
        : null
      return {
        ...quote,
        effectiveness: rate,
        effectivenessPercent: rate == null ? null : Math.round(rate * 100)
      }
    })
  }

  pickCheapest(quotes) {
    const available = quotes.filter(
      (quote) => quote.available && quote.supportedForDeliveryType
    )
    if (available.length === 0) {
      return null
    }
    return available.reduce((best, current) =>
      current.shippingCost < best.shippingCost ? current : best
    ).carrier
  }

  async getQuote(body, useCache = true) {
    const request = this.normalizeRequest(body)
    const upstreamPayload = this.buildUpstreamPayload(request)
    const cacheKey = this.buildCacheKey(upstreamPayload)

    if (useCache) {
      const cached = cache.get(cacheKey)
      if (cached) {
        logger.debug('Returning cached 99 Envíos quote')
        return { ...cached, fromCache: true }
      }
    }

    const sucursalId = config.envios99.quoteSucursalId
    logger.info('Requesting 99 Envíos quote', {
      origin: request.origin && request.origin.code,
      destination: request.destination.code,
      billableWeight: request.billableWeight,
      declaredValue: request.declaredValue,
      insurance: request.insurance
    })

    let upstream
    let effectiveness
    try {
      const [quoteResponse, effectivenessData] = await Promise.all([
        this.client.post(`/api/sucursal/cotizar/${sucursalId}`, upstreamPayload),
        this.getCityEffectiveness(request.destination.code)
      ])
      upstream = quoteResponse.data
      effectiveness = effectivenessData
    } catch (error) {
      logger.error('Error calling 99 Envíos quote API', {
        error: error.message,
        status: error.response && error.response.status,
        data: error.response && error.response.data
      })
      throw new Error('Failed to fetch quote from 99 Envíos: ' + error.message)
    }

    if (!upstream || Object.keys(upstream).length === 0) {
      throw new Error('Empty quote response from 99 Envíos')
    }

    const quotes = CARRIER_ORDER
      .filter((carrier) => upstream[carrier])
      .map((carrier) => this.parseCarrierQuote(carrier, upstream[carrier], request))
      .filter(Boolean)

    const extraCarriers = Object.keys(upstream).filter(
      (carrier) => !CARRIER_ORDER.includes(carrier)
    )
    for (const carrier of extraCarriers) {
      const parsed = this.parseCarrierQuote(carrier, upstream[carrier], request)
      if (parsed) quotes.push(parsed)
    }

    const quotesWithEffectiveness = this.attachEffectiveness(quotes, effectiveness)
    const availableQuotes = quotesWithEffectiveness.filter(
      (quote) => quote.available && quote.supportedForDeliveryType
    )

    if (availableQuotes.length === 0) {
      const error = new Error(
        request.deliveryType.name === 'veredas'
          ? 'No hay servicio de entrega a veredas disponible para esta ciudad'
          : request.deliveryType.name === 'oficina'
            ? 'No hay servicio de entrega en oficina disponible para esta ciudad'
            : 'No se obtuvieron resultados de cotización válidos'
      )
      error.status = 404
      throw error
    }

    const result = {
      success: true,
      source: '99envios-public-quote',
      origin: request.origin,
      destination: request.destination,
      deliveryType: request.deliveryType.name,
      serviceType: request.serviceType,
      cashOnDelivery: request.cashOnDelivery,
      insurance: request.insurance,
      antiReturnInsurance: request.antiReturnInsurance,
      antiReturnInsurancePlus: request.antiReturnInsurancePlus,
      package: {
        grossWeight: request.grossWeight,
        volumetricWeight: request.volumetricWeight,
        billableWeight: request.billableWeight,
        length: request.length,
        width: request.width,
        height: request.height,
        declaredValue: request.declaredValue
      },
      effectivenessCity: effectiveness && effectiveness.ciudad ? effectiveness.ciudad : null,
      cheapestCarrier: this.pickCheapest(quotesWithEffectiveness),
      quotes: quotesWithEffectiveness,
      timestamp: new Date().toISOString(),
      fromCache: false
    }

    if (useCache) {
      cache.set(cacheKey, result)
    }

    logger.success('99 Envíos quote retrieved', {
      destination: request.destination.code,
      carriers: quotesWithEffectiveness.length,
      cheapest: result.cheapestCarrier
    })

    return result
  }
}

module.exports = new QuoteService()
