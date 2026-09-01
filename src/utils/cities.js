const cities = require('../data/colombia-cities.json')

function stripAccents(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeCityText(value) {
  return stripAccents(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

function isDaneCode(value) {
  return /^\d{5,8}$/.test(String(value || '').trim())
}

function padDaneCode(value) {
  const digits = String(value || '').trim()
  if (!/^\d{5,8}$/.test(digits)) {
    return null
  }
  return digits.padEnd(8, '0')
}

function findCityByCode(code) {
  const padded = padDaneCode(code)
  if (!padded) {
    return null
  }
  return cities.find((city) => city.code === padded) || { code: padded, name: padded }
}

function scoreCityMatch(city, query) {
  const name = normalizeCityText(city.name)
  const municipality = name.split(' ')[0] || name

  if (name === query) return 100
  if (municipality === query) return 90
  if (name.startsWith(query)) return 80
  if (` ${name} `.includes(` ${query} `)) return 70
  if (name.includes(query)) return 50
  return 0
}

function searchCities(query, limit = 20) {
  const normalized = normalizeCityText(query)
  if (!normalized) {
    return []
  }

  if (isDaneCode(normalized)) {
    const match = findCityByCode(normalized)
    return match ? [match] : []
  }

  return cities
    .map((city) => ({ city, score: scoreCityMatch(city, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.city.name.localeCompare(b.city.name, 'es')
    })
    .slice(0, limit)
    .map((entry) => entry.city)
}

function resolveCity(input) {
  if (input == null || input === '') {
    return null
  }

  if (typeof input === 'object') {
    const code = input.code || input.codigo || input.value
    const name = input.name || input.nombre || input.label
    if (code && isDaneCode(code)) {
      return findCityByCode(code)
    }
    if (name) {
      return resolveCity(name)
    }
  }

  const text = String(input).trim()
  if (isDaneCode(text)) {
    return findCityByCode(text)
  }

  const matches = searchCities(text, 5)
  if (matches.length === 0) {
    return null
  }

  if (matches.length === 1) {
    return matches[0]
  }

  const top = matches[0]
  const second = matches[1]
  const topScore = scoreCityMatch(top, normalizeCityText(text))
  const secondScore = scoreCityMatch(second, normalizeCityText(text))
  if (topScore >= 80 && topScore > secondScore) {
    return top
  }

  const error = new Error(
    `Ciudad ambigua "${text}". Coincide con: ${matches.map((city) => `${city.name} (${city.code})`).join(', ')}`
  )
  error.status = 400
  error.matches = matches
  throw error
}

function listCities() {
  return cities
}

module.exports = {
  isDaneCode,
  padDaneCode,
  findCityByCode,
  searchCities,
  resolveCity,
  listCities,
  normalizeCityText
}
