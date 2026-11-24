# Gran Pollada Pro Salud · Caja y Cocina

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
Atajos: `https://tu-app/#escaner` abre el escáner y `https://tu-app/#cocina` la pantalla de cocina.

## Secciones (barra inferior)

| Pestaña | Qué hace |
|---|---|
| **Vender** | Nombre, celular y **cuántas polladas** (1, 2, 3… hasta 20 en un solo registro). Numeración automática (siguientes libres) o manual (`45`, `45, 46, 47` o `45-47`), con validación de duplicados y stock. Cada pollada lleva su propio ticket y QR; se envían todos juntos por WhatsApp. |
| **Escáner** | Cámara trasera o "Escanear con foto". 🟢 1000 Hz = pagado → pasa a **Por recoger** (cola de Cocina). 🟡 alerta = falta cobrar (cobra y lo manda a cocina desde la misma pantalla). 🔴 300 Hz = ya escaneado / ya recibido (muestra la hora) o QR inválido/adulterado. Búsqueda manual por N° o nombre. |
| **Cocina** | Cola en orden de llegada con el **nombre** de quien recoge, cuántas polladas y sus N°. Botón "Entregar · marcar recibido" (se toca 2 veces para confirmar). Pestaña "Recibidos" con opción de deshacer. Suena un aviso cuando entra un pedido nuevo. |
| **Tabla** | Una fila por compra (no por ticket), 20 por página, buscador y filtros fijos arriba. Al tocar una compra: cobrar todo, entregar o anular cada ticket, reenviar. |
| **Dashboard** | Progreso de ventas, caja (Yape, efectivo, por cobrar), cocina (despachadas/por recoger), **+50 / +100 cupos** (continúa la numeración), exportar CSV para Excel y respaldo JSON. |

## Flujo de estados

`Sin escanear` → (escáner) → `En cocina / Por recoger` → (cocina entrega) → `Recibido`

## Ticket

El ticket es el **afiche original sin modificar** (`public/ticket-base.jpg`, 1536×1024). Encima solo se
dibujan el QR y el N° correlativo, dentro del recuadro blanco "QR TM" (medido al píxel en
`components/TicketCard.tsx`). Si cambias el afiche por otro, actualiza ahí las medidas `CAJA`.

## Numeración y QR

- La numeración va del **N° 501 al 800** y luego salta al **N° 1001** en adelante (del 801 al 1000 no se usan). Con 500 cupos: 501–800 y 1001–1200. Se cambia en `BLOQUES`, `lib/evento.ts`. (se cambia en `NUMERO_INICIAL`, `lib/evento.ts`).
- Cada venta guarda el **vendedor**; el Dashboard muestra cuánto vendió cada uno (ejecuta `supabase/03-vendedor.sql` una vez).
- "Siguiente libre" toma el **menor número sin vender**, así que si anulas una venta ese número se reutiliza.
- El QR contiene `POLLADA-2026-042-9F3A1C0B`: número + firma aleatoria de 8 caracteres. Si alguien copia el
  número en otro QR, la firma no coincide y el escáner lo marca como **adulterado**.

## Guardado: LocalStorage o Supabase

**Sin configurar nada**, cada celular guarda en su propio LocalStorage. Sirve si **un solo celular**
vende y escanea. Si caja y cocina usan celulares distintos, activa Supabase:

1. Crea un proyecto en supabase.com → SQL Editor → pega y ejecuta `supabase/schema.sql`.
2. Copia `.env.example` a `.env.local` y llena `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o la antigua `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
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

