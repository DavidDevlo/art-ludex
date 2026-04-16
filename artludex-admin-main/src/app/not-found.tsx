"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Lógica de redirección
  useEffect(() => {
    if (!isLoading && !user) {
      // Si no estás logueado y entras a una url rara, mejor ve al login
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) return null; 
  if (!user) return null;

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-center p-4">
      <div className="bg-white p-8 rounded-full shadow-sm mb-6 animate-bounce">
        <FileQuestion size={64} className="text-slate-300" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 mb-2">Página no encontrada</h1>
      <p className="text-slate-500 mb-8 max-w-md">
        Parece que te has perdido en el almacén. Esta página no existe o ha sido movida.
      </p>
      
      <Button 
        onClick={() => router.push("/dashboard")}
        className="bg-slate-900 hover:bg-slate-800"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver al Panel
      </Button>
    </div>
  );
}