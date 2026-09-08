import React, { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toPng } from "html-to-image";
import { useUserAuth } from "../../context/UserAuthContext.jsx";

// Renders the shareable card at native 9:16 (1080x1920 scaled down for
// on-screen preview) then rasterizes it client-side with html-to-image —
// no server round trip needed for something this simple.
export default function SocialExport() {
  const { stampId } = useParams();
  const navigate = useNavigate();
  const { user } = useUserAuth();
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // In production this comes from the stamp fetched by stampId; MVP wires
  // the visual + export pipeline against known-good sample data.
  const stamp = {
    fortName: "Rajgad",
    uid: "MM-RJG-000482",
    acquiredLabel: "8 Sep 2026",
  };
  const username = user?.phone ? `@trekker_${user.phone.slice(-4)}` : "@trekker";

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `sahyadri-passport-${stamp.fortName.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <button onClick={() => navigate(-1)} className="self-start text-parchment/50 text-sm mb-4">
        ← Back to Vault
      </button>

      <div
        ref={cardRef}
        className="w-[270px] aspect-[9/16] rounded-2xl bg-forest-deep relative overflow-hidden flex flex-col justify-between p-6"
      >
        <div className="absolute inset-0 bg-kraft-fiber opacity-30" />
        <p className="relative text-gold-bright text-[10px] tracking-widest font-medium">
          SAHYADRI PASSPORT
        </p>

        <div className="relative text-center">
          <p className="font-display text-4xl foil-text leading-tight">{stamp.fortName}</p>
          <p className="text-parchment/50 text-xs mt-2">Summit verified · {stamp.acquiredLabel}</p>
        </div>

        <div className="relative">
          <p className="font-mono text-[9px] text-parchment/30 mb-1">{stamp.uid}</p>
          <p className="text-parchment text-sm font-medium">{username}</p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        className="mt-6 w-full max-w-[270px] rounded-lg bg-gold-foil text-charcoal font-semibold py-3 disabled:opacity-40"
      >
        {downloading ? "Preparing…" : "Save for Instagram Stories"}
      </button>
    </div>
  );
}
