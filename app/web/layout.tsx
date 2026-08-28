import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusivas Inteligentes · Distribución horeca en Palencia",
  description: "Catálogo de bebidas, servicio y pedidos para hostelería en Palencia.",
};

export default function WebLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
