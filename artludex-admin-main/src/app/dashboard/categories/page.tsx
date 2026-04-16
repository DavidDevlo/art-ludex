"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/cloudinary-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Plus, Trash2, Tag, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

// Definimos el tipo de dato actualizado
type Category = {
  id: string;
  name: string;
  slug: string;
  image_id?: string | null;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Estado para el formulario
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", slug: "", image_id: "" });
  
  // Estado para imágenes
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [initialImageId, setInitialImageId] = useState<string | null>(null);

  // 1. Cargar Categorías
  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (error) toast.error("Error cargando categorías");
    else setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // --- MANEJO DE IMÁGENES ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      // Si ya subimos una en este intento (y no es la guardada), la borramos para no dejar basura
      if (formData.image_id && formData.image_id !== initialImageId) {
        await deleteImageFromCloudinary(formData.image_id);
      }

      const res = await uploadImageToCloudinary(file);
      setFormData(prev => ({ ...prev, image_id: res.public_id }));
      setPreviewUrl(res.secure_url);
      toast.success("Imagen cargada");
    } catch (e) {
      toast.error("Error al subir imagen");
    } finally {
      setUploading(false);
    }
  };

  // 2. Guardar (Crear o Editar)
  const handleSave = async () => {
    if (!formData.name || !formData.slug) return toast.warning("Nombre y Slug son obligatorios");

    try {
      if (editingCategory) {
        // EDITAR
        const { error } = await supabase
          .from('categories')
          .update({ 
            name: formData.name, 
            slug: formData.slug,
            image_id: formData.image_id || null
          })
          .eq('id', editingCategory.id);
        
        if (error) throw error;

        // Limpieza: Si cambiamos la foto, borrar la vieja de Cloudinary
        if (initialImageId && initialImageId !== formData.image_id) {
            await deleteImageFromCloudinary(initialImageId);
        }

        toast.success("Categoría actualizada");
      } else {
        // CREAR
        const { error } = await supabase
          .from('categories')
          .insert([{ 
            name: formData.name, 
            slug: formData.slug,
            image_id: formData.image_id || null
          }]);
        
        if (error) throw error;
        toast.success("Categoría creada");
      }
      
      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar. Revisa que el 'slug' no esté repetido.");
    }
  };

  // 3. Eliminar
  const handleDelete = async (cat: Category) => {
    const confirm = window.confirm(`¿Seguro? Los productos de "${cat.name}" quedarán sin categoría.`);
    if (!confirm) return;

    try {
        // Primero borramos la imagen de Cloudinary si tiene
        if (cat.image_id) {
            await deleteImageFromCloudinary(cat.image_id);
        }

        const { error } = await supabase.from('categories').delete().eq('id', cat.id);
        if (error) throw error;

        toast.success("Categoría eliminada");
        fetchCategories();
    } catch (error) {
        toast.error("No se pudo eliminar");
    }
  };

  // Helpers del Modal
  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ 
          name: category.name, 
          slug: category.slug, 
          image_id: category.image_id || "" 
      });
      setInitialImageId(category.image_id || null);
      
      if (category.image_id) {
          setPreviewUrl(`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${category.image_id}`);
      } else {
          setPreviewUrl(null);
      }
    } else {
      // Nueva
      setEditingCategory(null);
      setFormData({ name: "", slug: "", image_id: "" });
      setInitialImageId(null);
      setPreviewUrl(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
      // Si subió una foto nueva pero canceló, deberíamos borrarla (opcional, por simplicidad lo dejamos)
      setIsDialogOpen(false);
      setEditingCategory(null);
      setPreviewUrl(null);
  };
  let tableContent;

if (loading) {
  tableContent = (
    <TableRow>
      <TableCell colSpan={4} className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
      </TableCell>
    </TableRow>
  );
} else if (categories.length === 0) {
  tableContent = (
    <TableRow>
      <TableCell colSpan={4} className="text-center py-8 text-slate-500">
        No hay categorías registradas.
      </TableCell>
    </TableRow>
  );
} else {
  tableContent = categories.map((cat) => (
    <TableRow key={cat.id}>
      <TableCell>
        <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden border">
          {cat.image_id ? (
            <img
              src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_100,c_fill,q_auto/${cat.image_id}`}
              alt={cat.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <ImageIcon size={16} />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="font-medium">{cat.name}</TableCell>
      <TableCell className="text-slate-500 text-sm">/{cat.slug}</TableCell>
      <TableCell className="text-right space-x-2">
        <Button variant="ghost" size="icon" onClick={() => openModal(cat)}>
          <Pencil className="h-4 w-4 text-blue-600" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </TableCell>
    </TableRow>
  ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Tag className="text-slate-500" /> Categorías
        </h1>
        <Button onClick={() => openModal()} className="bg-slate-900 text-white">
          <Plus className="mr-2 h-4 w-4" /> Nueva Categoría
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug (URL)</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableContent}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Creación/Edición */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            {/* Campo de Imagen */}
            <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden relative shrink-0">
                    {previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="text-slate-400" />
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Imagen de Portada</label>
                    <Input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                    />
                    {uploading && <p className="text-xs text-blue-500">Subiendo...</p>}
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input 
                placeholder="Ej. Mochilas Andinas" 
                value={formData.name}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(prev => ({ 
                    ...prev, 
                    name: val, 
                    slug: !editingCategory 
                      ? val.toLowerCase()
                           .replaceAll(' ', '-') // Cambiado de .replace(/ /g, '-')
                           .replaceAll(/[^\w-]+/g, '') // Aquí puedes mantener replace si es regex, pero Sonar prefiere consistencia
                      : prev.slug 
                  }));
                }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Slug (Identificador URL)</label>
              <Input 
                placeholder="Ej. mochilas-andinas" 
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
            </div>

            <Button onClick={handleSave} disabled={uploading} className="w-full bg-slate-900 mt-2">
              {uploading ? <Loader2 className="animate-spin mr-2" /> : null}
              Guardar Categoría
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
