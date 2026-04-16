import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configuración (reutiliza las variables de entorno)
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { public_id } = body;

    if (!public_id) {
      return NextResponse.json({ error: 'Falta public_id' }, { status: 400 });
    }

    // Ejecutamos la eliminación en Cloudinary
    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result !== 'ok') {
      throw new Error('Fallo al eliminar en Cloudinary');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}