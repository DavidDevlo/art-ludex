"use client";

import { useState } from "react";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/cloudinary-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function TestImagesPage() {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);

  // MANEJAR SUBIDA
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const toastId = toast.loading("Subiendo imagen...");

    try {
      // Si ya hay una imagen, la borramos primero (Lógica de Actualizar)
      if (publicId) {
        await deleteImageFromCloudinary(publicId);
        toast.info("Imagen anterior eliminada");
      }

      // Subimos la nueva
      const result = await uploadImageToCloudinary(file);
      
      setImageUrl(result.secure_url);
      setPublicId(result.public_id);
      
      toast.success("¡Imagen subida con éxito!", { id: toastId });
    } catch (error) {
      toast.error("Error al subir imagen", { id: toastId });
    } finally {
      setLoading(false);
      // Limpiamos el input para poder subir la misma foto si queremos
      e.target.value = ""; 
    }
  };

  // MANEJAR ELIMINACIÓN
  const handleDelete = async () => {
    if (!publicId) return;
    
    setLoading(true);
    try {
      await deleteImageFromCloudinary(publicId);
      setImageUrl(null);
      setPublicId(null);
      toast.success("Imagen eliminada correctamente");
    } catch (error) {
      toast.error("No se pudo eliminar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Laboratorio de Imágenes 🧪</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* ZONA DE CARGA */}
        <Card>
          <CardHeader>
            <CardTitle>Subir / Actualizar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                disabled={loading}
              />
            </div>
            <p className="text-sm text-slate-500">
              * Al seleccionar un archivo, se subirá automáticamente a Cloudinary.
              <br/>
              * Si ya hay una foto mostrada, la reemplazará (eliminará la vieja).
            </p>
          </CardContent>
        </Card>

        {/* VISUALIZADOR */}
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed rounded-lg p-4">
            {loading ? (
              <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
            ) : imageUrl ? (
              <div className="space-y-4 w-full">
                <div className="relative aspect-video w-full bg-slate-100 rounded-lg overflow-hidden">
                   {/* Usamos img normal por ahora para evitar configurar dominios en next.config.js */}
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={imageUrl} alt="Uploaded" className="object-contain w-full h-full" />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                  </Button>
                  <Button variant="outline" onClick={() => window.open(imageUrl, '_blank')}>
                    Ver Original
                  </Button>
                </div>
                <div className="text-xs text-slate-400 break-all bg-slate-50 p-2 rounded">
                  ID: {publicId}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <UploadCloud className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay imagen seleccionada</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}