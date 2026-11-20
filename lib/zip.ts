/**
 * ZIP mínimo (sin compresión) para descargar muchos tickets en UN solo archivo.
 * El navegador bloquea las descargas múltiples, pero un .zip es una sola descarga.
 */

const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(datos: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < datos.length; i++) c = TABLA[(c ^ datos[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export async function crearZip(archivos: { nombre: string; blob: Blob }[]): Promise<Blob> {
  const enc = new TextEncoder();
  const partes: BlobPart[] = [];
  const central: BlobPart[] = [];
  let tamCentral = 0;
  let offset = 0;
  const ahora = new Date();
  const hora = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
  const fecha = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

  for (const a of archivos) {
    const datos = new Uint8Array(await a.blob.arrayBuffer()) as Uint8Array<ArrayBuffer>;
    const nombre = enc.encode(a.nombre) as Uint8Array<ArrayBuffer>;
    const crc = crc32(datos);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nombres en UTF-8
    local.setUint16(8, 0, true); // sin compresión
    local.setUint16(10, hora, true);
    local.setUint16(12, fecha, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, datos.length, true);
    local.setUint32(22, datos.length, true);
    local.setUint16(26, nombre.length, true);
    local.setUint16(28, 0, true);
    partes.push(local.buffer, nombre, datos);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, hora, true);
    cen.setUint16(14, fecha, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, datos.length, true);
    cen.setUint32(24, datos.length, true);
    cen.setUint16(28, nombre.length, true);
    cen.setUint32(42, offset, true);
    const fila = new Uint8Array(46 + nombre.length);
    fila.set(new Uint8Array(cen.buffer), 0);
    fila.set(nombre, 46);
    central.push(fila as Uint8Array<ArrayBuffer>);
    tamCentral += fila.length;

    offset += 30 + nombre.length + datos.length;
  }

  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, archivos.length, true);
  fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tamCentral, true);
  fin.setUint32(16, offset, true);

  return new Blob([...partes, ...central, fin.buffer], { type: 'application/zip' });
}
