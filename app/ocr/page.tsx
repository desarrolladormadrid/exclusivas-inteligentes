"use client";
import { OcrIntelligent, Sidebar } from "../page";

export default function OcrPage() {
  const user = { username: "Luis", role: "admin", permissions: "*" };
  return <main className="crm-shell"><header className="topline"><span>EXCLUSIVAS INTELIGENTES</span></header><div className="appbar"><div className="brand"><div className="brand-mark">E</div><div><strong>Exclusivas</strong><small>Inteligentes</small></div></div><div className="appbar-actions"><span className="scanner-state ready">● Sistema operativo</span></div></div><div className="workspace"><Sidebar active="OCR inteligente" setActive={() => {}} user={user} moduleScope={["OCR inteligente"]} /><section className="content"><OcrIntelligent user={user} /></section></div></main>;
}
