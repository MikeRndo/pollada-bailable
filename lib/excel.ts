/**
 * Genera un Excel real (.xlsx) con formato: cada dato en su celda, encabezados de color,
 * filtros, primera fila fija, montos en soles y una hoja "Resumen" con totales y vendedores.
 * Sin librerías externas (usa el ZIP de lib/zip.ts).
 */
import { PRECIO, fechaHora, qrPayload } from './evento';
import type { Ticket } from './types';
import { crearZip } from './zip';

type Celda = string | number | null | undefined | { v: string | number; s: number };

// Índices de estilo (ver ESTILOS más abajo)
const S = {
  normal: 0,
  encabezado: 1,
  texto: 2,
  soles: 3,
  verde: 4,
  ambar: 5,
  azul: 6,
  naranja: 7,
  titulo: 8,
  subtitulo: 9,
  numero: 10,
  totalTxt: 11,
  totalSoles: 12,
  totalNum: 13,
} as const;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function col(i: number) {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function celda(ref: string, c: Celda, estiloDef: number) {
  if (c === null || c === undefined || c === '') return `<c r="${ref}" s="${estiloDef}"/>`;
  const { v, s } = typeof c === 'object' ? c : { v: c, s: estiloDef };
  if (typeof v === 'number') return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

function hoja(opts: {
  filas: { celdas: Celda[]; estilo?: number; alto?: number }[];
  anchos: number[];
  fijarHasta?: number;
  filtro?: string;
  unir?: string[];
}) {
  const xmlFilas = opts.filas
    .map((f, r) => {
      const n = r + 1;
      const alto = f.alto ? ` ht="${f.alto}" customHeight="1"` : '';
      return `<row r="${n}"${alto}>${f.celdas.map((c, i) => celda(`${col(i)}${n}`, c, f.estilo ?? S.texto)).join('')}</row>`;
    })
    .join('');
  const pane = opts.fijarHasta
    ? `<pane ySplit="${opts.fijarHasta}" topLeftCell="A${opts.fijarHasta + 1}" activePane="bottomLeft" state="frozen"/>`
    : '';
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView workbookViewId="0" zoomScale="110">${pane}</sheetView></sheetViews>` +
    `<cols>${opts.anchos.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${xmlFilas}</sheetData>` +
    (opts.filtro ? `<autoFilter ref="${opts.filtro}"/>` : '') +
    (opts.unir?.length ? `<mergeCells count="${opts.unir.length}">${opts.unir.map((u) => `<mergeCell ref="${u}"/>`).join('')}</mergeCells>` : '') +
    `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>` +
    `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>` +
    `</worksheet>`
  );
}

const ESTILOS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;S/ &quot;#,##0.00"/></numFmts>` +
  `<fonts count="5">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="16"/><color rgb="FF0A1220"/><name val="Calibri"/></font>` +
  `<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="8">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FF0A1220"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFDBEAFE"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFFFEDD5"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="2"><border/><border>` +
  ['left', 'right', 'top', 'bottom'].map((l) => `<${l} style="thin"><color rgb="FFD1D5DB"/></${l}>`).join('') +
  `<diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="14">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>` + // 0 normal
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>` + // 1 encabezado
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>` + // 2 texto
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1"/>` + // 3 soles
  `<xf numFmtId="0" fontId="0" fillId="3" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>` + // 4 verde
  `<xf numFmtId="0" fontId="0" fillId="4" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>` + // 5 ámbar
  `<xf numFmtId="0" fontId="0" fillId="5" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>` + // 6 azul
  `<xf numFmtId="0" fontId="0" fillId="6" borderId="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>` + // 7 naranja
  `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" applyFont="1"/>` + // 8 título
  `<xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/>` + // 9 subtítulo
  `<xf numFmtId="0" fontId="4" fillId="0" borderId="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>` + // 10 número
  `<xf numFmtId="0" fontId="4" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/>` + // 11 total texto
  `<xf numFmtId="164" fontId="4" fillId="7" borderId="1" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>` + // 12 total soles
  `<xf numFmtId="0" fontId="4" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>` + // 13 total número
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

const ENTREGA = { Pendiente: 'Sin escanear', PorRecoger: 'En cocina', Entregado: 'Recibido' } as const;
const estiloEntrega = { Pendiente: S.texto, PorRecoger: S.naranja, Entregado: S.azul } as const;

export async function crearExcel(tickets: Ticket[]): Promise<Blob> {
  const lista = [...tickets].sort((a, b) => a.numeroTicket - b.numeroTicket);
  const generado = fechaHora(new Date().toISOString());

  // ── Hoja 1: Tickets ──
  const enc = [
    'N° Ticket', 'Comprador', 'Teléfono', 'Vendedor', 'Método de pago', 'Estado de pago',
    'Pagado (S/)', 'Debe (S/)', 'Entrega', 'Fecha registro', 'Fecha pago', 'Fecha escaneo', 'Fecha recibido', 'Código QR',
  ];
  const ult = 4 + lista.length;
  const filas1 = [
    { celdas: [{ v: 'Gran Pollada Pro Salud — Registro de tickets', s: S.titulo }], alto: 26 },
    { celdas: [{ v: `Generado: ${generado} · ${lista.length} tickets`, s: S.subtitulo }] },
    { celdas: [] },
    { celdas: enc, estilo: S.encabezado, alto: 30 },
    ...lista.map((t) => ({
      celdas: [
        { v: t.numeroTicket, s: S.numero },
        t.comprador,
        t.telefono,
        t.vendedor || '—',
        t.metodoPago === 'Yape' ? 'Yape / Plin' : 'Efectivo',
        { v: t.estadoPago === 'Pagado' ? 'Pagado' : 'Pendiente', s: t.estadoPago === 'Pagado' ? S.verde : S.ambar },
        { v: t.estadoPago === 'Pagado' ? PRECIO : 0, s: S.soles },
        { v: t.estadoPago === 'Pendiente' ? PRECIO : 0, s: S.soles },
        { v: ENTREGA[t.estadoEntrega], s: estiloEntrega[t.estadoEntrega] },
        fechaHora(t.fechaRegistro),
        fechaHora(t.fechaPago),
        fechaHora(t.fechaEscaneo),
        fechaHora(t.fechaEntrega),
        qrPayload(t),
      ] as Celda[],
    })),
    {
      celdas: [
        { v: 'TOTAL', s: S.totalTxt },
        { v: `${lista.length} tickets`, s: S.totalTxt },
        ...Array(4).fill({ v: '', s: S.totalTxt }),
        { v: lista.filter((t) => t.estadoPago === 'Pagado').length * PRECIO, s: S.totalSoles },
        { v: lista.filter((t) => t.estadoPago === 'Pendiente').length * PRECIO, s: S.totalSoles },
        { v: `${lista.filter((t) => t.estadoEntrega === 'Entregado').length} recibidos`, s: S.totalNum },
      ] as Celda[],
    },
  ];
  const hoja1 = hoja({
    filas: filas1,
    anchos: [11, 28, 14, 18, 15, 15, 13, 12, 14, 18, 18, 18, 18, 30],
    fijarHasta: 4,
    filtro: `A4:N${ult}`,
    unir: ['A1:H1', 'A2:H2'],
  });

  // ── Hoja 2: Resumen ──
  const pag = lista.filter((t) => t.estadoPago === 'Pagado');
  const yape = pag.filter((t) => t.metodoPago === 'Yape').length;
  const efec = pag.length - yape;
  const pend = lista.length - pag.length;
  const recib = lista.filter((t) => t.estadoEntrega === 'Entregado').length;
  const coc = lista.filter((t) => t.estadoEntrega === 'PorRecoger').length;

  const vend = new Map<string, Ticket[]>();
  for (const t of lista) {
    const k = t.vendedor?.trim() || 'Sin vendedor';
    vend.set(k, [...(vend.get(k) ?? []), t]);
  }
  const filasVend = [...vend.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([nombre, ts]) => {
      const p = ts.filter((t) => t.estadoPago === 'Pagado');
      const y = p.filter((t) => t.metodoPago === 'Yape').length;
      const r = ts.filter((t) => t.estadoEntrega === 'Entregado').length;
      return {
        celdas: [
          nombre,
          { v: ts.length, s: S.numero },
          { v: y * PRECIO, s: S.soles },
          { v: (p.length - y) * PRECIO, s: S.soles },
          { v: (ts.length - p.length) * PRECIO, s: S.soles },
          { v: r, s: S.numero },
          { v: ts.length - r, s: S.numero },
        ] as Celda[],
      };
    });

  const kpi = (label: string, valor: number, soles = false) => ({
    celdas: [{ v: label, s: S.totalTxt }, { v: valor, s: soles ? S.totalSoles : S.totalNum }] as Celda[],
  });
  const hoja2 = hoja({
    filas: [
      { celdas: [{ v: 'Resumen · Gran Pollada Pro Salud', s: S.titulo }], alto: 26 },
      { celdas: [{ v: `Generado: ${generado}`, s: S.subtitulo }] },
      { celdas: [] },
      kpi('Tickets vendidos', lista.length),
      kpi('Cobrado por Yape / Plin', yape * PRECIO, true),
      kpi('Cobrado en efectivo', efec * PRECIO, true),
      kpi('TOTAL COBRADO', pag.length * PRECIO, true),
      kpi('Por cobrar', pend * PRECIO, true),
      kpi('Polladas recibidas', recib),
      kpi('En cocina', coc),
      kpi('Faltan entregar', lista.length - recib),
      { celdas: [] },
      { celdas: [{ v: 'Por vendedor', s: S.titulo }], alto: 24 },
      {
        celdas: ['Vendedor', 'Tickets', 'Yape / Plin', 'Efectivo', 'Por cobrar', 'Recibidos', 'Faltan entregar'],
        estilo: S.encabezado,
        alto: 30,
      },
      ...filasVend,
    ],
    anchos: [28, 14, 16, 16, 16, 14, 16],
    unir: ['A1:D1', 'A2:D2'],
  });

  const enc8 = new TextEncoder();
  const f = (nombre: string, txt: string) => ({ nombre, blob: new Blob([enc8.encode(txt)]) });
  return crearZip([
    f(
      '[Content_Types].xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    ),
    f(
      '_rels/.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    f(
      'xl/workbook.xml',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tickets" sheetId="1" r:id="rId1"/><sheet name="Resumen" sheetId="2" r:id="rId2"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Tickets!$A$4:$N$${ult}</definedName></definedNames></workbook>`,
    ),
    f(
      'xl/_rels/workbook.xml.rels',
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ),
    f('xl/styles.xml', ESTILOS),
    f('xl/worksheets/sheet1.xml', hoja1),
    f('xl/worksheets/sheet2.xml', hoja2),
  ]).then((b) => new Blob([b], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
}
