"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeScannerProps = {
  label?: string;
  onDetected: (value: string) => void;
  disabled?: boolean;
};

export default function BarcodeScanner({ label = "Escanear", onDetected, disabled = false }: BarcodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;
    const detectorClass = typeof window !== "undefined" ? (window as any).BarcodeDetector : null;

    const stop = () => {
      if (timer !== null) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    async function start() {
      if (!detectorClass) {
        setMessage("Este navegador no permite lectura automática. Usa el lector PDA o escribe el código.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("No hay cámara disponible. Usa el lector PDA o escribe el código.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new detectorClass({ formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] });
        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const detected = await detector.detect(videoRef.current);
            const value = String(detected?.[0]?.rawValue || "").trim();
            if (value) {
              onDetected(value);
              setMessage(`Código leído: ${value}`);
              setOpen(false);
              return;
            }
          } catch {
            setMessage("Acerca el código a la cámara y mantenlo enfocado.");
          }
          timer = window.setTimeout(() => void scan(), 450);
        };
        void scan();
      } catch {
        setMessage("No se ha podido abrir la cámara. Revisa el permiso o usa el lector PDA.");
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onDetected]);

  return <>
    <button type="button" className="button secondary warehouse-scan-button" disabled={disabled} onClick={() => { setMessage(""); setOpen(true); }}>
      ◉ {label}
    </button>
    {open && <div className="warehouse-scanner-overlay" role="dialog" aria-modal="true" aria-label={label}>
      <section className="warehouse-scanner-modal">
        <header><div><p className="eyebrow">LECTURA DE CÓDIGO</p><h2>{label}</h2><span>Apunta al QR o código de barras de la ubicación.</span></div><button type="button" className="preview-close" aria-label="Cerrar lector" onClick={() => setOpen(false)}>×</button></header>
        <div className="warehouse-scanner-view"><video ref={videoRef} playsInline muted /><span className="warehouse-scanner-frame" /></div>
        <p className="warehouse-scanner-message" role="status">{message || "Preparando cámara…"}</p>
        <footer><span>También puedes usar un lector PDA: enfoca el campo y escanea.</span><button type="button" className="button primary" onClick={() => setOpen(false)}>Cerrar</button></footer>
      </section>
    </div>}
  </>;
}
