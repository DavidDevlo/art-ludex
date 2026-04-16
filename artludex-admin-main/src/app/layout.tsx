import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ArtLudex Admin",
  description: "Panel de administración",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {/* AuthProvider maneja la sesión */}
        <AuthProvider>
          {children}
          {/* Toaster maneja las notificaciones emergentes */}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}