const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cambia a 30 una vez terminada la prueba
const DAYS_TO_KEEP = 15; 

async function cleanup() {
  console.log('Iniciando búsqueda de comprobantes...');

  // Busca imágenes en la carpeta o que tengan el nombre del preset como tag/asset_folder
  const result = await cloudinary.search
    .expression('folder:kremo-comprobantes OR asset_folder:kremo-comprobantes OR tags:kremocomprobante')
    .sort_by('created_at', 'asc')
    .max_results(100)
    .execute();

  console.log(`Comprobantes encontrados: ${result.total_count}`);

  if (result.resources.length > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);

    const oldAssets = result.resources.filter(
      (r) => new Date(r.created_at) < cutoff
    );

    if (oldAssets.length > 0) {
      const publicIds = oldAssets.map((r) => r.public_id);
      
      // Borra los recursos de Cloudinary por su public_id
      await cloudinary.api.delete_resources(publicIds);
      console.log(`✅ Se borraron ${publicIds.length} comprobantes viejos.`);
    } else {
      console.log('No hay comprobantes que superen el tiempo de retención.');
    }
  } else {
    console.log('⚠️ No se encontraron archivos. Ejecuta primero el script de inspección anterior para ver el public_id exacto.');
  }
}

cleanup().catch((err) => {
  console.error('Error al limpiar comprobantes:', err);
  process.exit(1);
});