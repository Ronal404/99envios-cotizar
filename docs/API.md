# Contrato del cotizador público

La página [https://99envios.app/cotizar](https://99envios.app/cotizar) es una SPA React (`ultima-milla`). No documenta API para invitados, pero el JS ya habla con un backend REST.

99 Envíos también menciona una API oficial para clientes registrados (`/dashboardAdmin/api-directa`). Este repo cubre solo el **cotizador público**.

## Upstream

| Pieza | Detalle |
|--------|---------|
| Frontend | `https://99envios.app` (chunk `7093` cotizar, `3926` ciudades) |
| Backend | `https://integration1.99envios.app` (PHP 8.2, CORS `*`)
| Auth | Ninguna. Sucursal `21119` en la URL |
| Ciudades | Catálogo DANE de 8 dígitos embebido en el frontend (~1285) |

### POST `/api/sucursal/cotizar/21119`

```json
{
  "destino": { "nombre": "", "codigo": "05001000" },
  "origen": { "nombre": "", "codigo": "11001000" },
  "IdTipoEntrega": 1,
  "IdServicio": 2,
  "peso": 1,
  "largo": 10,
  "ancho": 10,
  "alto": 10,
  "fecha": "01-09-2026",
  "AplicaContrapago": true,
  "valorDeclarado": 50000,
  "seguro99": false,
  "seguro99plus": false
}
```

- `IdTipoEntrega`: `1` dirección, `2` oficina, `3` veredas
- `IdServicio`: `1` normal, `2` paquete (el form público manda `2`)
- Peso facturable: `max(peso bruto, largo*ancho*alto/6000)`
- Valor declarado mínimo: $25.000; $40.000 si el peso es 3–5 kg; $50.000 si es ≥ 6 kg
- Origen puede ir vacío

Respuesta por transportadora (`interrapidisimo`, `tcc`, `servientrega`, `coordinadora`, `envia`):

```json
{
  "mensaje": "cotizacion exitosa",
  "valor": 10896,
  "valor_contrapago": 3000,
  "sobreflete": 600,
  "seguro99": 0,
  "exito": true,
  "dias": "0",
  "fecha_entrega": null,
  "cotizacion_id": "..."
}
```

Costo en pantalla: `valor + sobreflete + valor_contrapago + seguro99 + seguro99plus`.

Oficina: la UI solo muestra Interrápidísimo y Coordinadora. Veredas: solo Interrápidísimo. Esta API marca `supportedForDeliveryType`.

### GET `/api/ver-efectividad-ciudades/{dane}`

```json
{
  "ciudad": "MEDELLÍN/MEDELLÍN",
  "transportadoras": {
    "tcc": { "efectividad": 0.89 }
  }
}
```

## Endpoints de este repo

Ver [README.md](../README.md).
