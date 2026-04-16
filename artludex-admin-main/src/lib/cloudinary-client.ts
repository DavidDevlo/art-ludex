import { toast } from "sonner";

/**
 * Sube un archivo a Cloudinary usando firma segura
 */
export async function uploadImageToCloudinary(file: File) {
  try {
    // 1. Pedir firma a nuestro backend
    const signResponse = await fetch('/api/cloudinary/sign', { method: 'POST' });
    const signData = await signResponse.json();

    if (!signData.signature) throw new Error("No se pudo firmar la subida");

    // 2. Preparar el formulario para Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '');
    formData.append('timestamp', signData.timestamp.toString());
    formData.append('signature', signData.signature);
    formData.append('folder', 'artludex-products');
    
    // Importante: Enviar la transformación que firmamos en el backend
    if (signData.transformation) {
      formData.append('transformation', signData.transformation);
    }

    // 3. Subir directo a Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const uploadResponse = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) throw new Error(uploadData.error?.message || "Error subiendo imagen");

    return {
      public_id: uploadData.public_id,
      secure_url: uploadData.secure_url
    };

  } catch (error) {
    console.error("Error Upload:", error);
    throw error;
  }
}

/**
 * Elimina una imagen de Cloudinary
 */
export async function deleteImageFromCloudinary(publicId: string) {
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId }),
    });

    if (!response.ok) throw new Error("Error eliminando imagen");
    
    return true;
  } catch (error) {
    console.error("Error Delete:", error);
    // No lanzamos error crítico aquí para no bloquear el flujo de la UI si falla el borrado
    // throw error; 
    return false;
  }
}