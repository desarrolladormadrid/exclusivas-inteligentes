import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Exclusivas Inteligentes | Distribución profesional de bebidas",
  description: "Ofertas profesionales, servicio cercano y distribución de bebidas para hostelería en Palencia.",
  keywords: ["distribuidora de bebidas", "hostelería Palencia", "ofertas horeca", "pedidos bebidas"],
  openGraph: {
    title: "Más género, mejores condiciones | Exclusivas Inteligentes",
    description: "Descubre ofertas profesionales y un catálogo pensado para que tu negocio venda más.",
    type: "website",
    locale: "es_ES",
  },
};

export default function WebLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
