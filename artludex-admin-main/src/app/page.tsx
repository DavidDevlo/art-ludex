"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Solo tomamos decisiones cuando AuthProvider haya terminado de cargar
    if (!isLoading) {
      if (user) {
        // Si hay usuario, vamos al panel
        router.push("/dashboard");
      } else {
        // Si no, vamos al login
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  // Mientras decide, mostramos una pantalla de carga limpia
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
      <div className="bg-white p-4 rounded-full shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
      <p className="text-slate-500 text-sm font-medium animate-pulse">
        Cargando ArtLudex...
      </p>
    </div>
  );
}