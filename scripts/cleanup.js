// Borra automáticamente los comprobantes de pago de Kremó que ya superaron
// el tiempo de retención definido en DAYS_TO_KEEP.
// Corre desde GitHub Actions (ver .github/workflows/cleanup-receipts.yml),
// nunca desde el navegador — necesita el API Secret de Cloudinary, que no
// puede exponerse en el sitio web.

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Carpeta donde caen los comprobantes subidos desde el checkout.
// Tiene que coincidir con la carpeta configurada en tu upload preset
// "kremocomprobante" (ver instrucciones más abajo).
const FOLDER = 'kremo-comprobantes';

// Cuántos días se guarda un comprobante antes de borrarse.
// Cambiá este número si querés más o menos tiempo de retención.
const DAYS_TO_KEEP = 30;

async function cleanup() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);

  let nextCursor = undefined;
  let deleted = 0;

  do {
    const result = await cloudinary.search
      .expression(`folder:${FOLDER}`)
      .sort_by('created_at', 'asc')
      .max_results(100)
      .next_cursor(nextCursor)
      .execute();

    const oldAssets = result.resources.filter(
      (r) => new Date(r.created_at) < cutoff
    );

    if (oldAssets.length > 0) {
      const publicIds = oldAssets.map((r) => r.public_id);
      await cloudinary.api.delete_resources(publicIds);
      deleted += publicIds.length;
      console.log(`Borrados ${publicIds.length} comprobantes viejos.`);
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  console.log(`Listo. Total de comprobantes borrados: ${deleted}`);
}

cleanup().catch((err) => {
  console.error('Error al limpiar comprobantes:', err);
  process.exit(1);
});