import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configuración del servidor
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Definimos la transformación de optimización
    // w_1000: Ancho máximo 1000px
    // c_limit: Si la foto es más pequeña, no la estira
    // q_auto: Calidad automática (reduce peso sin perder nitidez visual)
    // f_auto: Formato automático (jpg, webp, avif según convenga)
    const transformation = 'w_1000,c_limit,q_auto,f_auto';

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: 'artludex-products',
        transformation: transformation, // <--- Agregamos esto a la firma
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({ timestamp, signature, transformation });
    
  } catch (error) {
    console.error('Error firmando imagen:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}