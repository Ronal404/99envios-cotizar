# 99 Envíos Cotizar API

API REST para cotizar envíos de [99 Envíos](https://99envios.app/cotizar) contra Interrápidísimo, Coordinadora, TCC, Servientrega y Envía.

Mismo planteamiento que [InterAPI](https://github.com/Ronal404/InterAPI): la página no publica un endpoint para invitados, así que se usa el contrato REST que ya consume su frontend. Sin Puppeteer. Sin login.

**No oficial.** No está afiliada con 99 Envíos.

## Inicio rápido

```bash
git clone https://github.com/Ronal404/99envios-cotizar.git
cd 99envios-cotizar
npm install
cp .env.example .env
npm start
```

Servidor en `http://localhost:3002`

## Uso

### Cotizar

```bash
curl -X POST http://localhost:3002/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "originCity": "BOGOTA",
    "destinationCity": "MEDELLIN",
    "weight": 1,
    "length": 10,
    "width": 10,
    "height": 10,
    "declaredValue": 50000,
    "deliveryType": "direccion",
    "cashOnDelivery": true
  }'
```

`originCity` y `destinationCity` aceptan código DANE (`05001000`) o nombre (`MEDELLIN`).

### Ciudades

```bash
curl "http://localhost:3002/api/quote/cities?q=medellin"
```

### Efectividad por transportadora

```bash
curl "http://localhost:3002/api/quote/effectiveness/MEDELLIN"
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/quote` | Cotización multitransportadora |
| GET | `/api/quote/cities?q=` | Catálogo DANE (1285 ciudades) |
| GET | `/api/quote/effectiveness/:city` | Efectividad histórica |
| GET | `/api/health` | Health check |
| GET | `/api/cache/stats` | Stats del caché |
| POST | `/api/cache/clear` | Limpiar caché |

Costo que devuelve la API (igual que la web):

`valor + sobreflete + valor_contrapago + seguro99 + seguro99plus`

Con contraentrega, `profit` = valor declarado − ese costo.

## Cómo funciona

El JS de `https://99envios.app/cotizar` llama, sin autenticación:

- `POST https://integration1.99envios.app/api/sucursal/cotizar/21119`
- `GET https://integration1.99envios.app/api/ver-efectividad-ciudades/{dane}`

`21119` es la sucursal hardcodeada en su cotizador público. Detalle del contrato: [docs/API.md](docs/API.md).

## Configuración

```env
PORT=3002
API_KEY=                 # opcional
CACHE_TTL=900000
ENVIOS99_SUCURSAL_ID=21119
```

## Límites

- Tarifas del cotizador **público**, no las de una cuenta logueada.
- No genera guías. Crear guías exige su dashboard / API autenticada.
- El contrato puede cambiar si 99 Envíos actualiza el frontend.

## Licencia

MIT
