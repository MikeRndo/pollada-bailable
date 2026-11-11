# Gran Pollada Bailable · Caja y Cocina

PWA mobile-first (Next.js 15 + React 19 + TypeScript + Tailwind) para vender tickets,
enviarlos por WhatsApp con su QR, y despachar polladas en cocina escaneando el código.

## Arrancar

```bash
npm install
npm run dev            # http://localhost:3000
```

La **cámara en vivo solo funciona con HTTPS** (o `localhost`). Si abres `http://192.168…` en el celular, usa **Escanear con foto** o una de estas opciones:

- `npm run dev:https` y abre `https://IP-DE-TU-PC:3000` en el celular (acepta el certificado), o
- despliega gratis en **Vercel** (`npx vercel`) y usa el enlace `https://…`.

En el celular: menú del navegador → **Agregar a pantalla de inicio** para usarla como app.
Atajo para la cocina: `https://tu-app/#escaner` abre directo el escáner.

## Secciones (barra inferior)

| Pestaña | Qué hace |
|---|---|
| **Vender** | Nombre, celular y **cuántas polladas** (1, 2, 3… hasta 20 en un solo registro). Numeración automática (siguientes libres) o manual (`45`, `45, 46, 47` o `45-47`), con validación de duplicados y stock. Cada pollada lleva su propio ticket y QR; se envían todos juntos por WhatsApp. |
| **Escáner** | Cámara trasera. 🟢 1000 Hz = pagado → se marca **Entregado**. 🟡 alerta = falta cobrar (cobra y entrega desde la misma pantalla). 🔴 300 Hz = ya canjeado (muestra la hora) o QR inválido/adulterado. Búsqueda manual por N° o nombre. Botón **Escanear con foto** que funciona incluso sin HTTPS. |
| **Tabla** | Una fila por compra (no por ticket), 20 por página, buscador y filtros fijos arriba. Al tocar una compra: cobrar todo, entregar o anular cada ticket, reenviar. |
| **Dashboard** | Progreso de ventas, caja (Yape, efectivo, por cobrar), cocina (despachadas/por recoger), **+50 / +100 cupos** (continúa la numeración), exportar CSV para Excel y respaldo JSON. |

## Numeración y QR

- Stock inicial: N° 001 al 500. Los cupos extra continúan en 501, 502…
- "Siguiente libre" toma el **menor número sin vender**, así que si anulas una venta ese número se reutiliza.
- El QR contiene `TICKET-042-9F3A1C0B`: número + firma aleatoria de 8 caracteres. Si alguien copia el
  número en otro QR, la firma no coincide y el escáner lo marca como **adulterado**.

## Guardado: LocalStorage o Supabase

**Sin configurar nada**, cada celular guarda en su propio LocalStorage. Sirve si **un solo celular**
vende y escanea. Si caja y cocina usan celulares distintos, activa Supabase:

1. Crea un proyecto en supabase.com → SQL Editor → pega y ejecuta `supabase/schema.sql`.
2. Copia `.env.example` a `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Project Settings → API). En Vercel ponlas en Environment Variables.
3. Reinicia. El icono de nube verde en la cabecera indica que está sincronizado en tiempo real.

Con Supabase, el número de ticket es único a nivel de base de datos y la entrega es atómica:
si dos escáneres leen el mismo QR a la vez, solo uno marca "Entregado" y el otro ve la alerta roja.

> Seguridad: las políticas del `schema.sql` permiten leer/editar con la anon key (pensado para un
> equipo pequeño de confianza). No compartas el enlace de la app con los compradores.

## Estructura

```
app/            layout (fuentes, PWA), page (pestañas), manifest, estilos
components/     TicketCard (réplica del afiche), TicketModal, VenderView, ScannerView,
                TablaView, DashboardView, BottomNav, ui
lib/            store (estado + LocalStorage/Supabase), evento (datos del afiche, formato, QR),
                sonido (Web Audio), whatsapp, exportar (CSV/JSON), supabase
supabase/       schema.sql
public/         sw.js (offline), icon.svg
```
