"use client";
import { useEffect, useState } from "react";
const defaults = {
  sales: true,
  openOrders: true,
  receivables: true,
  criticalStock: true,
  provider: "Gemini",
  model: "gemini-2.5-flash",
  endpoint: "https://generativelanguage.googleapis.com/v1beta",
  apiKey: "",
};
function apply(p: any) {
  if (typeof document === "undefined") return;
  for (const k of ["sales", "openOrders", "receivables", "criticalStock"])
    document.body.classList.toggle("hide-" + k, !p[k]);
}
export default function SettingsPanel() {
  const [publicPortal, setPublicPortal] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<any>(defaults);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setPublicPortal(window.location.pathname === "/portal-pedidos");
    try {
      const x = localStorage.getItem("excluvas.home");
      const saved = x ? JSON.parse(x) : {};
      const p = { ...defaults, ...saved, model: saved.model === "gemini-2.0-flash" ? "gemini-2.5-flash" : (saved.model || defaults.model) };
      setPrefs(p);
      apply(p);
    } catch {}
  }, []);
  if (publicPortal) return null;
  function update(k: string, v: any) {
    const p = { ...prefs, [k]: v };
    setPrefs(p);
    localStorage.setItem("excluvas.home", JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("excluvas-config-changed", { detail: p }));
    setSaved(false);
    if (["sales", "openOrders", "receivables", "criticalStock"].includes(k))
      apply(p);
  }
  function toggle(k: string) {
    update(k, !prefs[k]);
  }
  function saveAssistantConfig() {
    localStorage.setItem("excluvas.home", JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("excluvas-config-changed", { detail: prefs }));
    setSaved(true);
  }
  return (
    <>
      <button
        className="settings-fab"
        onClick={() => setOpen(!open)}
        aria-label="Abrir configuración"
      >
        ⚙
      </button>
      {open && (
        <aside className="settings-panel">
          <div className="settings-title">
            <div>
              <b>Configuración rápida</b>
              <small>Preferencias de Exclusivas</small>
            </div>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <h3>Mostrar en Inicio</h3>
          {(
            [
              ["sales", "Ventas del mes"],
              ["openOrders", "Pedidos abiertos"],
              ["receivables", "Por cobrar"],
              ["criticalStock", "Stock crítico"],
            ] as any[]
          ).map(([k, label]) => (
            <label className="setting-row" key={k}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={prefs[k]}
                onChange={() => toggle(k)}
              />
            </label>
          ))}
          <h3>Asistente IA</h3>
          <label className="settings-field">
            Proveedor
            <select
              value={prefs.provider}
              onChange={(e) => update("provider", e.target.value)}
            >
              <option>Gemini</option>
              <option>OpenAI</option>
              <option>Ollama local</option>
              <option>Compatible OpenAI</option>
            </select>
          </label>
          <label className="settings-field">
            Modelo
            <input
              value={prefs.model}
              onChange={(e) => update("model", e.target.value)}
              placeholder="gpt-5"
            />
          </label>
          <label className="settings-field">
            Dirección del servicio
            <input
              value={prefs.endpoint}
              onChange={(e) => update("endpoint", e.target.value)}
            />
          </label>
          <label className="settings-field">
            Clave de acceso
            <input
              type="password"
              value={prefs.apiKey}
              onChange={(e) => update("apiKey", e.target.value)}
              placeholder="Se guarda solo en este equipo"
            />
          </label>
          <small className="settings-note">
            La clave se guarda automáticamente en este equipo.
          </small>
          <div className="settings-save-row">
            <button type="button" className="button primary" onClick={saveAssistantConfig}>Guardar configuración</button>
            {saved && <span role="status">Guardado</span>}
          </div>
          <h3>Base de datos</h3>
          <div className="settings-storage">
            <div className="storage-head">
              <span>Base de datos local</span>
              <b>Activa</b>
            </div>
            <div className="storage-bar"><i /></div>
            <small>SQLite · persistencia habilitada</small>
          </div>
          <button className="settings-backup" onClick={() => window.open("/api/backup", "_blank")}>Descargar copia de seguridad</button>
          <small className="settings-note">Guarda esta copia en un lugar seguro antes de mover el CRM a otro equipo.</small>
        </aside>
      )}
    </>
  );
}
