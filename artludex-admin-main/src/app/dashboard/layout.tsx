"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2, LogOut, Package, LayoutGrid, Tag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Si terminó de cargar y NO hay usuario, patada al login
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          <p className="text-slate-500 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Simple */}
      <aside className="hidden w-64 flex-col border-r bg-white md:flex fixed h-full">
        <div className="p-6 border-b flex items-center gap-2">
          <div className="h-8 w-8 bg-slate-900 rounded-md flex items-center justify-center text-yellow-400 font-bold">AL</div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-none">ArtLudex</h2>
            <span className="text-xs text-slate-500">Admin Panel</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-100 text-slate-700 font-medium transition-colors">
            <LayoutGrid size={20} />
            Resumen
          </Link>
          <Link href="/dashboard/products" className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-100 text-slate-700 font-medium transition-colors">
            <Package size={20} />
            Productos
          </Link>
          <Link href="/dashboard/categories" className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-100 text-slate-700 font-medium transition-colors">
            <Tag size={20} />
            Categorías
          </Link>
        </nav>

        <div className="p-4 border-t space-y-4">
          <div className="px-2">
             <p className="text-xs font-semibold text-slate-400 uppercase">Usuario</p>
             <p className="text-sm text-slate-700 truncate" title={user.email}>{user.email}</p>
          </div>
          <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100" onClick={() => signOut()}>
            <LogOut size={16} className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Contenido Principal (con margen a la izquierda para el sidebar fijo) */}
      <main className="flex-1 md:ml-64 p-8">
        {children}
      </main>
    </div>
  );
}