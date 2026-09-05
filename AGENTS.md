# AGENTS.md

> **Proyecto**: 99envios-cotizar
> **Estado**: Wrapper Node del cotizador público de 99 Envíos. Sin Puppeteer.

## Propósito

API REST propia para cotizar envíos usando el mismo backend que `https://99envios.app/cotizar`.

## Flujo

1. `utils/cities.js` resuelve ciudad por código DANE o nombre.
2. `quote.service.js` llama a `integration1.99envios.app`.
3. `quote.controller.js` expone `POST /api/quote`.

## Comandos

```bash
npm start
npm run dev

curl http://localhost:3002/api/health

curl -X POST http://localhost:3002/api/quote \
  -H "Content-Type: application/json" \
  -d '{"destinationCity":"MEDELLIN","originCity":"BOGOTA","weight":1,"length":10,"width":10,"height":10,"declaredValue":50000,"insurance":"antidevolucion"}'
```

`insurance`: `none` (default) | `antidevolucion` | `plus`. Solo con contraentrega. Alias: `antiReturnInsurance` / `antiReturnInsurancePlus` o `seguro99` / `seguro99plus`.

## Convenciones

- Comillas simples
- `async/await`
- Usar `logger` en lugar de `console`
- No agregar Puppeteer ni dependencias pesadas

## Crítico

- El payload aguas arriba debe coincidir con el frontend de 99 Envíos.
- Valor declarado mínimo: 25000 / 40000 / 50000 según peso facturable.
- Peso facturable = max(bruto, largo*ancho*alto/6000).
