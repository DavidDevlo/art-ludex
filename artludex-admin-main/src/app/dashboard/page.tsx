"use client";

import { useEffect, useState } from "react";
import Link from "next/link"; // Importamos Link para navegación
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Importamos Button de Shadcn
import { Package, Tag, TrendingUp, Loader2, ArrowRight } from "lucide-react"; // Agregamos ArrowRight

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ products: 0, categories: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Pedimos solo el conteo ('count'), sin traer los datos ('head: true')
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true });

        const { count: categoriesCount } = await supabase
          .from('categories')
          .select('*', { count: 'exact', head: true });

        setStats({ 
          products: productsCount || 0, 
          categories: categoriesCount || 0 
        });
      } catch (error) {
        console.error("Error cargando estadísticas", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Hola, {user?.email?.split("@")[0]} 👋
      </h1>
      
      {/* Tarjetas de Resumen (Stats) */}
      <div className="grid gap-4 md:grid-cols-3">
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : stats.products}
            </div>
            <p className="text-xs text-muted-foreground">Productos en catálogo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorías</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : stats.categories}
            </div>
            <p className="text-xs text-muted-foreground">Activas actualmente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">En Línea</div>
            <p className="text-xs text-muted-foreground">Base de datos conectada</p>
          </CardContent>
        </Card>

      </div>
      
      {/* Mensaje de bienvenida y ACCESOS RÁPIDOS PARA MÓVIL */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Panel de Administración</h3>
        <p className="text-blue-700 mb-6 max-w-2xl">
          Gestiona tu inventario desde aquí. Si estás en un celular, usa estos botones para navegar rápidamente a las secciones principales.
        </p>
        
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/products">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm h-12 px-6">
              <Package className="mr-2 h-5 w-5" />
              Ir a Productos
              <ArrowRight className="ml-2 h-4 w-4 opacity-70" />
            </Button>
          </Link>
          
          <Link href="/dashboard/categories">
            <Button variant="outline" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-bold h-12 px-6">
              <Tag className="mr-2 h-5 w-5" />
              Gestionar Categorías
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}