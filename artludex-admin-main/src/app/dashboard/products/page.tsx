"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { deleteImageFromCloudinary } from "@/lib/cloudinary-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Search, Edit3, Ruler, Layers, DollarSign, Archive, Eye, EyeOff, AlertCircle, X, Trash2, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// --- TIPOS ---
type Product = {
  id: string;
  name: string;
  category_id: string;
  categories: { name: string } | null;
  unit_price: number;
  wholesale_price: number;
  capital_price: number;
  stock: number;
  description_short: string;
  main_image_id: string | null; // Puede ser null
  extra_images: string[]; // Array de IDs de imágenes extra
  measurements: { name: string; width: string; height: string }[];
  has_embroidery: boolean;
  state: 'publico' | 'privado' | 'archivado';
};

type Category = {
  id: string;
  name: string;
};

const ITEMS_PER_PAGE = 8;

// --- HELPER: Formatear Moneda ---
const formatMoney = (cents: number) => {
  if (!cents && cents !== 0) return "S/ 0.00";
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(cents / 100);
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Estados de Carga y Paginación
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // FILTROS
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterState, setFilterState] = useState("all");

  // Debounce para buscador
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 1. Cargar Categorías (Solo una vez)
  useEffect(() => {
    const fetchCats = async () => {
      const { data } = await supabase.from('categories').select('*');
      if (data) setCategories(data);
    };
    fetchCats();
  }, []);

  // 2. Función Maestra de Carga de Productos
  const fetchProducts = async (pageNumber: number, isNewFilter: boolean = false) => {
    try {
      if (isNewFilter) setLoading(true);
      else setLoadingMore(true);

      let query = supabase
        .from('products')
        .select('*, categories(name)')
        .order('created_at', { ascending: false })
        .range(pageNumber * ITEMS_PER_PAGE, (pageNumber + 1) * ITEMS_PER_PAGE - 1);

      // Aplicar Filtros
      if (filterCategory !== "all") query = query.eq('category_id', filterCategory);
      if (filterState !== "all") query = query.eq('state', filterState);
      if (debouncedSearch) query = query.ilike('name', `%${debouncedSearch}%`);

      const { data, error } = await query;

      if (error) {
        toast.error("Error cargando productos");
        throw error;
      }

      const newProds = data || [];

      // Verificar si hay más páginas
      if (newProds.length < ITEMS_PER_PAGE) setHasMore(false);
      else setHasMore(true);

      if (isNewFilter) {
        setProducts(newProds);
      } else {
        setProducts(prev => [...prev, ...newProds]);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Recargar cuando cambian filtros
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchProducts(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterCategory, filterState]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage, false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategory("all");
    setFilterState("all");
  };

  const hasActiveFilters = searchTerm !== "" || filterCategory !== "all" || filterState !== "all";

  // --- LÓGICA DE ELIMINACIÓN ---
  const handleDelete = async (product: Product) => {
    const confirm = window.confirm(`¿Estás seguro de ELIMINAR "${product.name}"?\n\nEsta acción no se puede deshacer y borrará todas las imágenes asociadas.`);
    if (!confirm) return;

    const toastId = toast.loading("Eliminando producto e imágenes...");

    try {
      // 1. Recolectar TODAS las imágenes (Principal + Extras)
      const imagesToDelete = [];
      
      if (product.main_image_id) {
        imagesToDelete.push(product.main_image_id);
      }
      
      if (product.extra_images && product.extra_images.length > 0) {
        imagesToDelete.push(...product.extra_images);
      }

      // 2. Eliminar de Cloudinary (si hay imágenes)
      if (imagesToDelete.length > 0) {
        await Promise.all(
          imagesToDelete.map(id => deleteImageFromCloudinary(id))
        ).catch(err => console.error("Error limpiando Cloudinary:", err));
      }

      // 3. Eliminar de la Base de Datos
      const { error } = await supabase.from('products').delete().eq('id', product.id);
      if (error) throw error;

      // 4. Actualizar UI
      setProducts(prev => prev.filter(p => p.id !== product.id));
      toast.success("Producto e imágenes eliminados", { id: toastId });

    } catch (error) {
      console.error(error);
      toast.error("Error al eliminar", { id: toastId });
    }
  };

  // --- LÓGICA DE DESCARGA DE IMAGEN ---
  const handleDownloadImage = async (url: string, filename: string) => {
    const toastId = toast.loading("Descargando...");
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${filename.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success("Descarga iniciada", { id: toastId });
    } catch (error) {
      console.error(error);
      window.open(url, '_blank');
      toast.dismiss(toastId);
    }
  };

  // --- COMPONENTE TARJETA ---
  const ProductCard = ({ product }: { product: Product }) => {
    const imageUrl = product.main_image_id 
      ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/w_500,c_fill,g_auto,q_auto/${product.main_image_id}`
      : null;

    return (
      <div className="bg-white border-2 border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col h-full group">
        
        {/* IMAGEN + BADGES */}
        <div className="relative aspect-square w-full bg-slate-100 border-b">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <Package size={64} opacity={0.2} />
            </div>
          )}
          
          <div className="absolute top-2 right-2 flex gap-2">
             {/* Botón Descarga */}
             {imageUrl && (
               <Button 
                 size="icon" 
                 className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
                 onClick={() => handleDownloadImage(imageUrl, product.name)}
                 title="Descargar imagen"
               >
                 <Download size={16} />
               </Button>
             )}
          </div>

          <div className="absolute top-2 left-2">
            <Badge className={`
              ${product.state === 'publico' ? 'bg-green-600' : product.state === 'privado' ? 'bg-slate-600' : 'bg-orange-600'} 
              text-white border-0 shadow-md px-2 py-0.5 text-xs font-bold
            `}>
              {product.state === 'publico' ? <Eye size={12} className="mr-1"/> : <EyeOff size={12} className="mr-1"/>}
              {product.state.toUpperCase()}
            </Badge>
          </div>
          
          {product.stock <= 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white font-bold text-center py-1 text-xs">
              SIN STOCK
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="p-4 flex flex-col flex-1 gap-3">
          <div>
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
               {product.categories?.name || "Sin Categoría"}
             </span>
             <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-2" title={product.name}>
               {product.name}
             </h3>
          </div>

          {/* PRECIOS */}
          <div className="bg-slate-50 rounded-lg p-2 grid grid-cols-3 gap-2 text-center border border-slate-200">
             <div>
                <span className="block text-[10px] text-slate-500 uppercase font-bold">Unidad</span>
                <span className="block text-sm font-black text-slate-900">{formatMoney(product.unit_price)}</span>
             </div>
             <div className="border-x border-slate-200">
                <span className="block text-[10px] text-slate-500 uppercase font-bold">Mayor</span>
                <span className="block text-sm font-black text-blue-700">{formatMoney(product.wholesale_price)}</span>
             </div>
             <div>
                <span className="block text-[10px] text-slate-400 uppercase font-bold">Costo</span>
                <span className="block text-sm font-medium text-slate-500">{formatMoney(product.capital_price)}</span>
             </div>
          </div>

          {/* DETALLES */}
          <div className="space-y-1">
             <div className="flex items-center text-xs font-medium text-slate-700">
                <Layers size={14} className="mr-2 text-slate-400"/> 
                Stock: <strong className={`ml-1 ${product.stock > 0 ? "text-slate-900" : "text-red-600"}`}>{product.stock}</strong>
             </div>
             {product.has_embroidery && (
                 <div className="flex items-center text-xs font-bold text-purple-700">
                    <DollarSign size={14} className="mr-2"/> Bordado Disponible
                 </div>
             )}
             {product.measurements?.length > 0 && (
                <div className="flex items-start text-xs text-slate-600 mt-1">
                   <Ruler size={14} className="mr-2 text-slate-400 shrink-0 mt-0.5"/> 
                   <div className="flex flex-wrap gap-1">
                      {product.measurements.slice(0, 2).map((m, idx) => (
                         <span key={idx} className="bg-slate-100 border px-1.5 py-0.5 rounded text-[10px]">
                            {m.name}
                         </span>
                      ))}
                      {product.measurements.length > 2 && <span className="text-[10px] text-slate-400">...</span>}
                   </div>
                </div>
             )}
          </div>
          
          <div className="flex-1"></div>
          
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <Link href={`/dashboard/products/${product.id}`} className="w-full">
              <Button className="w-full bg-slate-900 hover:bg-slate-800 font-bold h-10 shadow-sm">
                <Edit3 size={16} className="mr-2"/> EDITAR
              </Button>
            </Link>
            <Button 
                onClick={() => handleDelete(product)}
                variant="destructive" 
                className="h-10 w-10 px-0 shadow-sm bg-red-100 hover:bg-red-200 text-red-600 border border-red-200"
                title="Eliminar"
            >
                <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-slate-500" /> Inventario
          </h1>
          <p className="text-sm text-slate-500">
            {loading ? "Cargando..." : "Gestiona tus productos"}
          </p>
        </div>
        <Link href="/dashboard/products/new">
          <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-bold w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> AGREGAR PRODUCTO
          </Button>
        </Link>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4 md:space-y-0 md:flex md:gap-4 items-end">
        <div className="flex-1 space-y-1 w-full">
           <span className="text-xs font-bold text-slate-500 uppercase ml-1">Buscar</span>
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-slate-400 h-4 w-4" />
             <Input 
               placeholder="Nombre..." 
               className="pl-9"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
        <div className="space-y-1 w-full md:w-40">
           <span className="text-xs font-bold text-slate-500 uppercase ml-1">Categoría</span>
           <Select value={filterCategory} onValueChange={setFilterCategory}>
             <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todas</SelectItem>
               {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
             </SelectContent>
           </Select>
        </div>
        <div className="space-y-1 w-full md:w-32">
           <span className="text-xs font-bold text-slate-500 uppercase ml-1">Estado</span>
           <Select value={filterState} onValueChange={setFilterState}>
             <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
             <SelectContent>
               <SelectItem value="all">Todos</SelectItem>
               <SelectItem value="publico">Público</SelectItem>
               <SelectItem value="privado">Privado</SelectItem>
               <SelectItem value="archivado">Archivado</SelectItem>
             </SelectContent>
           </Select>
        </div>
        {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-red-500">
                <X size={16} className="mr-1"/> Limpiar
            </Button>
        )}
      </div>

      {/* GRILLA (1 col Movil, 4 col PC) */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-slate-100 rounded-xl animate-pulse"></div>
           ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
           <AlertCircle size={32} className="text-slate-400 mx-auto mb-2"/>
           <h3 className="font-bold text-slate-700">No hay productos</h3>
           {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Borrar filtros</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* BOTÓN CARGAR MÁS */}
      {!loading && hasMore && (
        <div className="text-center pt-4">
          <Button 
            variant="outline" 
            onClick={handleLoadMore} 
            disabled={loadingMore}
            className="w-full md:w-auto"
          >
            {loadingMore ? <Loader2 className="animate-spin mr-2"/> : null}
            Cargar más productos
          </Button>
        </div>
      )}
    </div>
  );
}