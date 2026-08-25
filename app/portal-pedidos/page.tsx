"use client";
import { ClientOrderPortal } from "../page";

export default function PortalPedidos() {
  return <ClientOrderPortal standalone onClose={() => window.close()} onCreated={() => {}} />;
}
