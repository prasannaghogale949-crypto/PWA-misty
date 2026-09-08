import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserQRCodeReader } from "@zxing/browser";
import { supabase } from "../../lib/supabaseClient";
import { useUserAuth } from "../../context/UserAuthContext.jsx";

// Two-step flow, both inside one full-screen camera session:
//   1. SCAN   — read the die-cut stamp's serialized QR to identify which
//               fort was purchased.
//   2. VERIFY — overlay a transparent fort-silhouette viewfinder so the
//               trekker aligns the real skyline inside the cutout, then we
//               check their live GPS against that fort's known coordinates.
// Verification is what turns a "purchased" stamp into a "summited" one in
// the Vault — it's the gamified proof-of-visit, not just a receipt scan.

const STEPS = { SCAN: "scan", LOCATING: "locating", VERIFY: "verify", RESULT: "result" };
const SUMMIT_RADIUS_METERS = 400;

export default function UserScanner() {
  const { user } = useUserAuth();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const watchIdRef = useRef(null);

  const [step, setStep] = useState(STEPS.SCAN);
  const [stamp, setStamp] = useState(null); // { code, fortName, lat, lng }
  const [distanceM, setDistanceM] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [result, setResult] = useState(null); // { verified, message }
  const [cameraError, setCameraError] = useState("");

  const handleDecoded = useCallback(async (code) => {
    controlsRef.current?.stop();
    // `lookup_stamp_by_qr` is a public read — it only needs to return the
    // fort's name + summit coordinates so the client can render the
    // viewfinder; it does NOT claim the stamp (that needs auth + geofence
    // pass, handled by `verify_summit` below).
    const { data, error } = await supabase
      .from("stamps")
      .select("qr_code, fort_name, summit_lat, summit_lng")
      .eq("qr_code", code)
      .single();

    if (error || !data) {
      setResult({ verified: false, message: "This stamp code wasn't recognized." });
      setStep(STEPS.RESULT);
      return;
    }

    setStamp({
      code: data.qr_code,
      fortName: data.fort_name,
      lat: data.summit_lat,
      lng: data.summit_lng,
    });
    setStep(STEPS.LOCATING);
  }, []);

  // Step 1: QR scan
  useEffect(() => {
    if (step !== STEPS.SCAN) return;
    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (res, err, controls) => {
        controlsRef.current = controls;
        if (cancelled) return;
        if (res) handleDecoded(res.getText());
      })
      .catch(() => {
        setCameraError("Couldn't start the camera. Check your camera permission and retry.");
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [step, handleDecoded]);

  // Step 2: acquire GPS lock, then move to the AR viewfinder once we have a
  // live distance-to-summit reading.
  useEffect(() => {
    if (step !== STEPS.LOCATING || !stamp) return;
    if (!navigator.geolocation) {
      setLocationError("Location isn't available on this device.");
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const d = haversineMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          stamp.lat,
          stamp.lng
        );
        setDistanceM(d);
        setStep((s) => (s === STEPS.LOCATING ? STEPS.VERIFY : s));
      },
      () => setLocationError("Location access was denied. Enable it to verify your summit."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [step, stamp]);

  // Restart camera for the viewfinder step (visual alignment only — the
  // actual verification signal is GPS, not image recognition, for MVP).
  useEffect(() => {
    if (step !== STEPS.VERIFY) return;
    const reader = new BrowserQRCodeReader();
    let cancelled = false;
    reader
      .decodeFromVideoDevice(undefined, videoRef.current, () => {})
      .catch(() => {});
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [step]);

  async function confirmSummit() {
    const withinRange = distanceM != null && distanceM <= SUMMIT_RADIUS_METERS;

    if (!user) {
      // Frictionless: we only ever ask for a phone number once there's
      // something real to claim.
      sessionStorage.setItem(
        "mm_pending_claim",
        JSON.stringify({ code: stamp.code, verifiedByGps: withinRange })
      );
      navigate("/app/auth?next=claim");
      return;
    }

    if (!withinRange) {
      setResult({
        verified: false,
        message: `You're about ${Math.round(distanceM)}m from ${stamp.fortName}'s summit marker — get closer to the top and try again.`,
      });
      setStep(STEPS.RESULT);
      return;
    }

    const { data, error } = await supabase.rpc("verify_summit", {
      p_qr_code: stamp.code,
      p_user_id: user.id,
      p_distance_m: distanceM,
    });

    if (error) {
      setResult({ verified: false, message: error.message });
    } else {
      setResult({ verified: true, fortName: stamp.fortName, stampId: data.stamp_id });
    }
    setStep(STEPS.RESULT);
  }

  function reset() {
    setStamp(null);
    setDistanceM(null);
    setLocationError("");
    setResult(null);
    setCameraError("");
    setStep(STEPS.SCAN);
  }

  return (
    <div className="relative bg-black min-h-screen overflow-hidden">
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {step === STEPS.SCAN && (
        <ScanOverlay error={cameraError} />
      )}

      {step === STEPS.LOCATING && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="font-display text-xl text-parchment">{stamp?.fortName}</p>
          <p className="text-sm text-parchment/60">Finding your position for summit verification…</p>
          {locationError && <p className="text-rust text-sm mt-2">{locationError}</p>}
        </div>
      )}

      {step === STEPS.VERIFY && (
        <ARViewfinder
          fortName={stamp?.fortName}
          distanceM={distanceM}
          onConfirm={confirmSummit}
        />
      )}

      {step === STEPS.RESULT && <VerifyResult result={result} onDismiss={reset} />}
    </div>
  );
}

function ScanOverlay({ error }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-2xl border-2 border-gold-bright/80"
        style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)" }}
      />
      <p className="absolute top-6 inset-x-0 text-center text-parchment/90 text-sm bg-black/40 mx-auto w-fit px-3 py-1 rounded-full">
        Scan the QR code on your new stamp
      </p>
      {error && (
        <p className="absolute bottom-10 inset-x-6 text-center text-sm text-rust bg-charcoal-soft rounded-lg p-3 pointer-events-auto">
          {error}
        </p>
      )}
    </div>
  );
}

// The AR viewfinder: a transparent fort-silhouette cutout (SVG mask) the
// trekker lines up against the real skyline. A live distance readout and a
// radar-style proximity ring give continuous feedback, and the confirm
// button only reads as "ready" once GPS has a lock.
function ARViewfinder({ fortName, distanceM, onConfirm }) {
  const withinRange = distanceM != null && distanceM <= SUMMIT_RADIUS_METERS;

  return (
    <div className="absolute inset-0">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <mask id="fort-cutout">
            <rect width="400" height="700" fill="white" />
            {/* Fort silhouette: bastion wall + flag, used as a transparent
                cutout so the real horizon shows through unobstructed. */}
            <path
              d="M120 420 L120 340 L145 340 L145 310 L170 310 L170 340 L230 340 L230 310 L255 310 L255 340 L280 340 L280 420
                 L300 420 L300 460 L100 460 L100 420 Z
                 M195 300 L195 260 L235 280 L195 300 Z"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="400" height="700" fill="black" opacity="0.55" mask="url(#fort-cutout)" />
        <path
          d="M120 420 L120 340 L145 340 L145 310 L170 310 L170 340 L230 340 L230 310 L255 310 L255 340 L280 340 L280 420
             L300 420 L300 460 L100 460 L100 420 Z
             M195 300 L195 260 L235 280 L195 300 Z"
          fill="none"
          stroke={withinRange ? "#E4C455" : "#C9A876"}
          strokeWidth="2.5"
          opacity="0.9"
        />
      </svg>

      <div className="absolute top-6 inset-x-0 flex flex-col items-center gap-2">
        <p className="font-display text-lg text-parchment bg-black/40 px-3 py-1 rounded-full">
          {fortName} summit
        </p>
        <p
          className={`text-xs px-3 py-1 rounded-full font-medium ${
            withinRange ? "bg-gold-bright text-charcoal" : "bg-black/40 text-parchment/70"
          }`}
        >
          {distanceM == null
            ? "Locating…"
            : withinRange
            ? "In range — align and confirm"
            : `${Math.round(distanceM)}m to summit marker`}
        </p>
      </div>

      <div className="absolute bottom-8 inset-x-6">
        <button
          onClick={onConfirm}
          disabled={distanceM == null}
          className="w-full rounded-lg bg-gold-foil text-charcoal font-semibold py-3.5 shadow-embossed disabled:opacity-40"
        >
          Confirm summit
        </button>
        <p className="text-center text-[11px] text-parchment/40 mt-2">
          Fits the fort inside the frame? You're ready.
        </p>
      </div>
    </div>
  );
}

function VerifyResult({ result, onDismiss }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center px-8 text-center gap-4">
      {result?.verified ? (
        <>
          <div className="w-20 h-20 rounded-full bg-gold-foil flex items-center justify-center animate-unlock">
            <span className="text-3xl">✓</span>
          </div>
          <p className="font-display text-2xl text-parchment">Summit verified</p>
          <p className="text-sm text-parchment/70">
            {result.fortName} has been added to your Vault.
          </p>
        </>
      ) : (
        <>
          <p className="font-display text-2xl text-parchment">Not verified yet</p>
          <p className="text-sm text-parchment/70">{result?.message}</p>
        </>
      )}
      <button
        onClick={onDismiss}
        className="w-full max-w-xs rounded-lg border border-gold-dim text-parchment font-medium py-3 mt-2"
      >
        {result?.verified ? "Scan another stamp" : "Try again"}
      </button>
    </div>
  );
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
