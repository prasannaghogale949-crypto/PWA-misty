import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { supabase } from "../../lib/supabaseClient";
import { useManagerAuth } from "../../context/ManagerAuthContext.jsx";

const COMMISSION_PER_STAMP = Number(import.meta.env.VITE_COMMISSION_PER_STAMP ?? 70);

// Result states drive both the overlay color and the haptic/sound cue.
// idle -> scanning -> (activating) -> success | duplicate | invalid | error -> idle
const STATES = {
  SCANNING: "scanning",
  ACTIVATING: "activating",
  SUCCESS: "success",
  DUPLICATE: "duplicate",
  INVALID: "invalid",
  ERROR: "error",
};

export default function ManagerScanner() {
  const { manager } = useManagerAuth();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [state, setState] = useState(STATES.SCANNING);
  const [lastResult, setLastResult] = useState(null); // { code, fortName, priceINR }
  const [manualCode, setManualCode] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const activateCode = useCallback(
    async (rawCode) => {
      const code = rawCode.trim();
      if (!code) return;
      setState(STATES.ACTIVATING);
      try {
        // `activate_stamp` is a Postgres RPC that, in one transaction:
        //  1. looks up the serialized stamp by its QR-encoded UID
        //  2. checks it isn't already activated (idempotent — safe to
        //     re-scan without double-crediting commission)
        //  3. flags it Activated/Sold, stamps activated_at + manager_id
        //  4. inserts a ledger transaction row for today's commission
        // It returns the row so the UI can show the fort name + price
        // without a second round trip.
        const { data, error } = await supabase.rpc("activate_stamp", {
          p_qr_code: code,
          p_manager_id: manager.managerId,
        });

        if (error) throw error;

        if (data?.status === "already_activated") {
          setLastResult({ code, fortName: data.fort_name });
          setState(STATES.DUPLICATE);
        } else if (data?.status === "not_found") {
          setLastResult({ code });
          setState(STATES.INVALID);
        } else {
          setLastResult({
            code,
            fortName: data.fort_name,
            priceINR: COMMISSION_PER_STAMP,
          });
          setState(STATES.SUCCESS);
          if (navigator.vibrate) navigator.vibrate(60);
        }
      } catch (err) {
        setLastResult({ code, message: err.message });
        setState(STATES.ERROR);
      }
    },
    [manager]
  );

  // Camera lifecycle: start on mount, stop on unmount, restart when we
  // return to SCANNING after a result is dismissed.
  useEffect(() => {
    if (state !== STATES.SCANNING) return;
    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err, controls) => {
        controlsRef.current = controls;
        if (cancelled) return;
        if (result) {
          controls.stop();
          activateCode(result.getText());
        }
        // NotFoundException fires continuously while no code is in frame —
        // that's expected, not an error state.
      })
      .catch((err) => {
        setCameraError(
          err?.name === "NotAllowedError"
            ? "Camera access was denied. Enable it in your browser settings, or enter the code manually."
            : "Couldn't start the camera. Enter the code manually instead."
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [state, activateCode]);

  function reset() {
    setLastResult(null);
    setManualCode("");
    setCameraError("");
    setState(STATES.SCANNING);
  }

  return (
    <div className="relative flex-1 bg-black min-h-[calc(100vh-108px)] overflow-hidden">
      {/* Live camera feed fills the frame */}
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Dimmed mask with a clear square viewfinder cutout */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-black/55" />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-2xl"
          style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
        >
          <div className="absolute inset-0 rounded-2xl border-2 border-gold-bright/80" />
          {state === STATES.SCANNING && (
            <div className="absolute left-0 right-0 h-0.5 bg-gold-bright/90 animate-scan-line shadow-[0_0_12px_2px_rgba(228,196,85,0.7)]" />
          )}
          {/* corner marks */}
          {["-left-1 -top-1", "-right-1 -top-1", "-left-1 -bottom-1", "-right-1 -bottom-1"].map(
            (pos, i) => (
              <div
                key={i}
                className={`absolute ${pos} w-5 h-5 border-gold-bright ${
                  i === 0
                    ? "border-t-4 border-l-4 rounded-tl-lg"
                    : i === 1
                    ? "border-t-4 border-r-4 rounded-tr-lg"
                    : i === 2
                    ? "border-b-4 border-l-4 rounded-bl-lg"
                    : "border-b-4 border-r-4 rounded-br-lg"
                }`}
              />
            )
          )}
        </div>
      </div>

      <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-parchment/90 text-sm font-medium bg-black/40 inline-block px-3 py-1 rounded-full">
          {state === STATES.SCANNING
            ? "Align the stamp's QR code in the frame"
            : state === STATES.ACTIVATING
            ? "Activating…"
            : ""}
        </p>
      </div>

      {cameraError && state === STATES.SCANNING && (
        <div className="absolute inset-x-4 bottom-28 bg-charcoal-soft border border-charcoal-line rounded-xl p-4 text-sm text-parchment/80">
          {cameraError}
        </div>
      )}

      {/* Result overlay */}
      {state !== STATES.SCANNING && state !== STATES.ACTIVATING && (
        <ResultOverlay state={state} result={lastResult} onDismiss={reset} />
      )}

      {/* Manual entry fallback — always reachable, low-friction for a bad scan */}
      <div className="absolute bottom-4 inset-x-4">
        {showManual ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              controlsRef.current?.stop();
              activateCode(manualCode);
              setShowManual(false);
            }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter serial code"
              className="flex-1 rounded-lg bg-charcoal-soft border border-charcoal-line px-3 py-2 text-parchment text-sm outline-none focus:border-gold"
            />
            <button
              type="submit"
              className="rounded-lg bg-gold-foil text-charcoal font-semibold px-4 text-sm"
            >
              Activate
            </button>
          </form>
        ) : (
          state === STATES.SCANNING && (
            <button
              onClick={() => setShowManual(true)}
              className="w-full text-xs text-parchment/60 underline underline-offset-2"
            >
              Can't scan? Enter the code manually
            </button>
          )
        )}
      </div>
    </div>
  );
}

function ResultOverlay({ state, result, onDismiss }) {
  const config = {
    success: {
      bg: "bg-forest",
      title: "Stamp activated",
      body: result?.fortName
        ? `${result.fortName} — ₹${result.priceINR} commission logged.`
        : "Commission logged.",
    },
    duplicate: {
      bg: "bg-charcoal-soft",
      title: "Already activated",
      body: result?.fortName
        ? `This ${result.fortName} stamp was already sold. No commission added.`
        : "This stamp was already sold. No commission added.",
    },
    invalid: {
      bg: "bg-rust",
      title: "Code not recognized",
      body: "This code doesn't match any stamp in inventory. Check for damage or contact support.",
    },
    error: {
      bg: "bg-rust",
      title: "Couldn't activate",
      body: result?.message || "Something went wrong. Try again.",
    },
  }[state];

  return (
    <div className="absolute inset-0 flex items-end justify-center p-4 bg-black/40">
      <div
        className={`w-full max-w-sm rounded-2xl p-5 ${config.bg} shadow-stamp border border-charcoal-line`}
      >
        <p className="font-display text-xl text-parchment mb-1">{config.title}</p>
        <p className="text-sm text-parchment/80 mb-4">{config.body}</p>
        {result?.code && (
          <p className="font-mono text-[11px] text-parchment/40 mb-4 break-all">
            {result.code}
          </p>
        )}
        <button
          onClick={onDismiss}
          className="w-full rounded-lg bg-gold-foil text-charcoal font-semibold py-2.5"
        >
          Scan next stamp
        </button>
      </div>
    </div>
  );
}
