"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinary, deleteImageFromCloudinary } from "@/lib/cloudinary-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ArrowLeft, CheckCircle, Image as ImageIcon, Ruler, Tag, FileText, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

// --- TIPOS ---
type Measurement = {
  name: string;   // Ej: Grande
  height: string; // Ej: 30
  width: string;  // Ej: 20
};

type ProductForm = {
  name: string;
  category_id: string;
  description_short: string;
  description_long: string;
  
  // Precios en CÉNTIMOS (Enteros)
  unit_price: number;      // Antes sale_price (Precio Venta Unidad)
  wholesale_price: number; // Precio Mayorista
  capital_price: number;   // Precio Capital
  
  display_price_label: string; // "Consultar", "S/ 5.00", etc.
  stock: number;
  
  has_embroidery: boolean;
  state: 'publico' | 'privado' | 'archivado';
  
  measurements: Measurement[];
  
  main_image_id: string;
  extra_images: string[];
};

const DEFAULT_FORM: ProductForm = {
  name: "",
  category_id: "",
  description_short: "",
  description_long: "",
  unit_price: 0,
  wholesale_price: 0,
  capital_price: 0,
  display_price_label: "Consultar",
  stock: 1,
  has_embroidery: false,
  state: "privado",
  measurements: [],
  main_image_id: "",
  extra_images: [],
};

// --- COMPONENTE AUXILIAR: INPUT DE PRECIO (Mejorado) ---
const PriceInput = ({ 
  value, 
  onChange, 
  label 
}: { 
  value: number, 
  onChange: (val: number) => void, 
  label?: string 
}) => {
  // Convertimos céntimos (150) a string decimal ("1.50")
  const [localStr, setLocalStr] = useState("");

  // Sincronización inteligente: Solo actualiza si el valor externo cambia DRÁSTICAMENTE
  useEffect(() => {
    const numericLocal = parseFloat(localStr);
    const numericProp = value / 100;
    
    if (isNaN(numericLocal) || Math.abs(numericLocal - numericProp) > 0.001) {
       setLocalStr(numericProp.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalStr(val); 

    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      onChange(Math.round(num * 100));
    } else if (val === "") {
      onChange(0);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="relative">
        <span className="absolute left-3 top-2.5 text-slate-500 text-sm font-bold">S/</span>
        <Input 
          type="number" 
          step="0.01" 
          min="0"
          className="pl-8 font-mono"
          value={localStr}
          onChange={handleChange}
          onBlur={() => {
            const num = parseFloat(localStr);
            if (!isNaN(num)) {
               setLocalStr(num.toFixed(2));
            }
          }}
        />
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function ProductWizard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === "new";
  const router = useRouter();
  
  // ESTADOS
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState<ProductForm>(DEFAULT_FORM);
  
  const [mainPreviewUrl, setMainPreviewUrl] = useState<string | null>(null);
  const [initialMainImageId, setInitialMainImageId] = useState<string | null>(null);
  
  // Nuevo estado: Rastrea qué fotos extra venían de la base de datos
  const [initialExtraImages, setInitialExtraImages] = useState<string[]>([]);

  // CARGA INICIAL
  useEffect(() => {
    const loadData = async () => {
      const { data: cats } = await supabase.from('categories').select('*');
      setCategories(cats || []);

      if (!isNew) {
        const { data: prod, error } = await supabase.from('products').select('*').eq('id', id).single();
        
        if (error) {
          toast.error("Producto no encontrado");
          router.push("/dashboard/products");
          return;
        }

        setFormData({
            ...prod,
            // Mapeo seguro de precios
            unit_price: prod.unit_price ?? prod.sale_price ?? 0, 
            wholesale_price: prod.wholesale_price ?? 0,
            measurements: Array.isArray(prod.measurements) ? prod.measurements : [],
            extra_images: prod.extra_images || []
        });

        // Guardamos las imágenes iniciales para compararlas después
        setInitialExtraImages(prod.extra_images || []);

        if (prod.main_image_id) {
            setInitialMainImageId(prod.main_image_id);
            setMainPreviewUrl(`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${prod.main_image_id}`);
        }
      }
    };
    loadData();
  }, [isNew, id, router]);

  const updateField = (field: keyof ProductForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // --- IMÁGENES ---
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      if (formData.main_image_id && formData.main_image_id !== initialMainImageId) {
        await deleteImageFromCloudinary(formData.main_image_id);
      }
      const res = await uploadImageToCloudinary(file);
      updateField('main_image_id', res.public_id);
      setMainPreviewUrl(res.secure_url);
      toast.success("Imagen cargada");
    } catch (e) {
      toast.error("Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const toastId = toast.loading("Subiendo extra...");
    try {
      const res = await uploadImageToCloudinary(file);
      updateField('extra_images', [...formData.extra_images, res.public_id]);
      toast.success("Extra agregada", { id: toastId });
    } catch (e) {
      toast.error("Error subiendo extra", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const removeExtraImage = async (index: number) => {
    const imageIdToRemove = formData.extra_images[index];
    
    // Si la imagen NO estaba al inicio, significa que es una subida temporal de esta sesión.
    // La borramos inmediatamente para no dejar basura.
    if (!initialExtraImages.includes(imageIdToRemove)) {
        try {
            await deleteImageFromCloudinary(imageIdToRemove);
        } catch (e) {
            console.error("Error borrando imagen temporal", e);
        }
    }
    
    // Si la imagen SÍ estaba al inicio, solo la quitamos de la lista visual.
    // Se borrará realmente de Cloudinary cuando el usuario guarde los cambios.

    const newExtras = formData.extra_images.filter((_, i) => i !== index);
    updateField('extra_images', newExtras);
  };

  // --- MEDIDAS ---
  const addMeasurement = () => {
    updateField('measurements', [...formData.measurements, { name: "", height: "", width: "" }]);
  };

  const updateMeasurement = (index: number, field: keyof Measurement, value: string) => {
    // Validación: No permitir negativos en alto/ancho
    if ((field === 'height' || field === 'width') && parseFloat(value) < 0) return;

    const newM = [...formData.measurements];
    newM[index][field] = value;
    updateField('measurements', newM);
  };

  const removeMeasurement = (index: number) => {
    const newM = formData.measurements.filter((_, i) => i !== index);
    updateField('measurements', newM);
  };

  // --- GUARDAR ---
  const handleSave = async () => {
    if (!formData.name) return toast.error("Falta el nombre");
    if (formData.unit_price <= 0) return toast.error("El precio debe ser mayor a 0");

    setLoading(true);
    try {
      const slug = isNew 
        ? `${formData.name.toLowerCase().replace(/ /g, '-')}-${Date.now()}`.replace(/[^\w-]+/g, '')
        : undefined;

      const payload = {
        name: formData.name,
        category_id: formData.category_id,
        description_short: formData.description_short,
        description_long: formData.description_long,
        unit_price: formData.unit_price,
        wholesale_price: formData.wholesale_price,
        capital_price: formData.capital_price,
        display_price_label: formData.display_price_label,
        stock: formData.stock,
        has_embroidery: formData.has_embroidery,
        state: formData.state,
        measurements: formData.measurements,
        main_image_id: formData.main_image_id,
        extra_images: formData.extra_images,
        ...(slug && { slug })
      };

      if (isNew) {
        const { error } = await supabase.from('products').insert([payload]);
        if (error) throw error;
        toast.success("Producto Creado");
      } else {
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
        
        // 1. Limpieza de imagen principal reemplazada
        if (initialMainImageId && initialMainImageId !== formData.main_image_id) {
            await deleteImageFromCloudinary(initialMainImageId);
        }

        // 2. Limpieza de imágenes extra que estaban guardadas pero el usuario quitó
        const removedExtras = initialExtraImages.filter(id => !formData.extra_images.includes(id));
        if (removedExtras.length > 0) {
            await Promise.all(removedExtras.map(id => deleteImageFromCloudinary(id)));
        }

        toast.success("Producto Actualizado");
      }
      router.push("/dashboard/products");
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // INDICADOR DE PASOS
  const StepsIndicator = () => (
    <div className="flex justify-between mb-8 px-2 overflow-x-auto">
      {[
        { n: 1, label: "Datos & Precios", icon: Tag },
        { n: 2, label: "Detalles", icon: FileText },
        { n: 3, label: "Fotos & Medidas", icon: ImageIcon },
        { n: 4, label: "Confirmar", icon: CheckCircle }
      ].map((s) => (
        <button
            key={s.n}
            onClick={() => setStep(s.n)}
            className={`flex flex-col items-center gap-2 min-w-[80px] ${step === s.n ? 'text-blue-600 font-bold' : 'text-slate-400'}`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${step === s.n ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                <s.icon size={20} />
            </div>
            <span className="text-xs whitespace-nowrap">{s.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 md:px-0">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-2xl font-bold">{isNew ? "Nuevo Producto" : "Editar Producto"}</h1>
      </div>

      <StepsIndicator />

      {/* --- PASO 1 --- */}
      {step === 1 && (
        <Card className="animate-in fade-in slide-in-from-right-4">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Nombre del Producto *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => updateField('name', e.target.value)} 
                placeholder="Ej. Mochila Andina Roja" 
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={formData.category_id} onValueChange={(val) => updateField('category_id', val)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Stock Disponible</Label>
                    <Input 
                        type="number" 
                        min="0"
                        value={formData.stock} 
                        onChange={(e) => updateField('stock', parseInt(e.target.value) || 0)} 
                    />
                    <p className="text-[10px] text-slate-500">Visible solo para Admin.</p>
                </div>
            </div>

            <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-slate-900">Precios (Interno)</h3>
                <div className="grid grid-cols-2 gap-4">
                    <PriceInput 
                        label="Precio Unidad" 
                        value={formData.unit_price} 
                        onChange={(v) => updateField('unit_price', v)} 
                    />
                    <PriceInput 
                        label="Precio Mayorista" 
                        value={formData.wholesale_price} 
                        onChange={(v) => updateField('wholesale_price', v)} 
                    />
                    <div className="col-span-2">
                        <PriceInput 
                            label="Precio Capital (Costo)" 
                            value={formData.capital_price} 
                            onChange={(v) => updateField('capital_price', v)} 
                        />
                    </div>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                    <Label className="text-blue-900">Etiqueta para la Web</Label>
                    <Input 
                        className="bg-white mt-1"
                        value={formData.display_price_label} 
                        onChange={(e) => updateField('display_price_label', e.target.value)} 
                        placeholder="Ej. Consultar"
                    />
                    <p className="text-xs text-blue-600 mt-1">Texto visible al cliente en la web.</p>
                </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- PASO 2 --- */}
      {step === 2 && (
        <Card className="animate-in fade-in slide-in-from-right-4">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label>Descripción Corta (Tarjeta)</Label>
              <Input 
                value={formData.description_short} 
                onChange={(e) => updateField('description_short', e.target.value)} 
                placeholder="Resumen breve..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción Larga (Detalle)</Label>
              <Textarea 
                className="h-32"
                value={formData.description_long} 
                onChange={(e) => updateField('description_long', e.target.value)} 
                placeholder="Detalles completos..."
              />
            </div>
            <div className="flex items-center space-x-2 border p-3 rounded-lg bg-slate-50">
                <Switch 
                    id="embroidery" 
                    checked={formData.has_embroidery}
                    onCheckedChange={(checked) => updateField('has_embroidery', checked)}
                />
                <Label htmlFor="embroidery">¿Permite bordado personalizado?</Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- PASO 3 --- */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <Card>
                <CardContent className="pt-6 space-y-6">
                    <div>
                        <Label className="flex items-center gap-2 mb-2"><ImageIcon size={16}/> Foto Principal</Label>
                        <div className="flex items-start gap-4">
                             <div className="border-2 border-dashed rounded-lg p-2 w-32 h-32 flex items-center justify-center bg-slate-50 relative shrink-0 overflow-hidden">
                                {mainPreviewUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={mainPreviewUrl} alt="Main" className="w-full h-full object-cover rounded"/>
                                ) : <span className="text-xs text-slate-400">Vacío</span>}
                             </div>
                             <div className="flex-1 space-y-2">
                                <Input type="file" accept="image/*" onChange={handleMainImageUpload} disabled={uploading} />
                                <p className="text-xs text-slate-500">La imagen anterior se borrará al guardar.</p>
                             </div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <Label className="flex items-center gap-2 mb-2"><Plus size={16}/> Fotos Extra</Label>
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            {formData.extra_images.map((imgId, idx) => (
                                <div key={idx} className="relative aspect-square bg-slate-100 rounded border group overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img 
                                        src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${imgId}`} 
                                        className="w-full h-full object-cover"
                                        alt="extra"
                                    />
                                    <button 
                                        onClick={() => removeExtraImage(idx)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={12}/>
                                    </button>
                                </div>
                            ))}
                            <div className="aspect-square border-2 border-dashed rounded flex items-center justify-center bg-slate-50 hover:bg-slate-100 cursor-pointer relative">
                                <Plus className="text-slate-400"/>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleExtraImageUpload}
                                    disabled={uploading}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                        <Label className="flex items-center gap-2"><Ruler size={16}/> Medidas (cm)</Label>
                        <Button size="sm" variant="outline" onClick={addMeasurement}>+ Talla</Button>
                    </div>
                    
                    {formData.measurements.length === 0 && <p className="text-sm text-slate-400 italic">No hay medidas registradas.</p>}

                    {formData.measurements.map((m, idx) => (
                        <div key={idx} className="flex gap-2 items-end bg-slate-50 p-2 rounded">
                            <div className="flex-[2]">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Nombre</span>
                                <Input placeholder="Ej: Grande" value={m.name} onChange={(e) => updateMeasurement(idx, 'name', e.target.value)} className="bg-white h-8 text-sm" />
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Alto</span>
                                <Input type="number" min={0} placeholder="0" value={m.height} onChange={(e) => updateMeasurement(idx, 'height', e.target.value)} className="bg-white h-8 text-sm" />
                            </div>
                            <div className="flex-1">
                                <span className="text-[10px] text-slate-500 uppercase font-bold">Ancho</span>
                                <Input type="number" min={0} placeholder="0" value={m.width} onChange={(e) => updateMeasurement(idx, 'width', e.target.value)} className="bg-white h-8 text-sm" />
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeMeasurement(idx)}>
                                <Trash2 size={14}/>
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
      )}

      {/* --- PASO 4 --- */}
      {step === 4 && (
        <Card className="animate-in fade-in slide-in-from-right-4">
            <CardContent className="pt-6 space-y-6 text-center">
                <div className="space-y-4">
                    <Label className="text-lg">Visibilidad</Label>
                    <div className="flex flex-col gap-2">
                        {[
                            { id: 'publico', label: '🌍 PÚBLICO', desc: 'Visible para todos en la web.' },
                            { id: 'privado', label: '🔒 PRIVADO', desc: 'Solo tú lo ves (Borrador).' },
                            { id: 'archivado', label: '📦 ARCHIVADO', desc: 'Fuera de stock / Antiguo.' }
                        ].map((st) => (
                            <button
                                key={st.id}
                                onClick={() => updateField('state', st.id)}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                    formData.state === st.id 
                                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600' 
                                    : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span className={`block font-bold ${formData.state === st.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {st.label}
                                </span>
                                <span className="text-sm text-slate-500">{st.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-6 border-t">
                    <Button onClick={handleSave} disabled={loading} className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 shadow-lg">
                        {loading ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2"/>}
                        {isNew ? "Guardar Producto Nuevo" : "Guardar Cambios"}
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t flex justify-between z-10 md:static md:bg-transparent md:border-0 md:mt-8">
        <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
            Atrás
        </Button>
        {step < 4 ? (
            <Button onClick={() => setStep(s => Math.min(4, s + 1))}>
                Siguiente
            </Button>
        ) : (
            <span className="text-sm text-slate-400 self-center hidden md:block">Todo listo</span>
        )}
      </div>

    </div>
  );
}