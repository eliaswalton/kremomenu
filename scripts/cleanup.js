const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = 'kremo-comprobantes';
const DAYS_TO_KEEP = 0; // Se mantiene en 0 para la prueba

async function cleanup() {
  console.log(`Iniciando búsqueda en Cloudinary...`);
  console.log(`Buscando con expresión: folder:${FOLDER}/* OR folder:${FOLDER}`);

  // Buscamos tanto la carpeta exactas como su contenido
  const result = await cloudinary.search
    .expression(`folder:${FOLDER}/* OR folder:${FOLDER}`)
    .sort_by('created_at', 'asc')
    .max_results(100)
    .execute();

  console.log(`Total de archivos encontrados en la carpeta: ${result.total_count}`);

  if (result.resources.length > 0) {
    console.log('Archivos hallados:');
    result.resources.forEach(r => {
      console.log(` - ID: ${r.public_id} | Creado: ${r.created_at}`);
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);

    const oldAssets = result.resources.filter(
      (r) => new Date(r.created_at) < cutoff
    );

    if (oldAssets.length > 0) {
      const publicIds = oldAssets.map((r) => r.public_id);
      await cloudinary.api.delete_resources(publicIds);
      console.log(`✅ Borrados ${publicIds.length} comprobantes.`);
    } else {
      console.log('⚠️ Se encontraron archivos, pero ninguno cumple el criterio de fecha.');
    }
  } else {
    console.log('❌ No se encontró NINGÚN archivo dentro de esa carpeta.');
    console.log('Verifica en Cloudinary (Assets) la ruta exacta donde están guardadas las imágenes.');
  }
}

cleanup().catch((err) => {
  console.error('Error al limpiar comprobantes:', err);
  process.exit(1);
});