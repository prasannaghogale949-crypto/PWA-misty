import React from "react";
import { Link } from "react-router-dom";

// Two visual states, per the brief:
//  - locked:   a cinematic silhouette — the fort's outline in near-black,
//              teasing what's collectible without revealing detail.
//  - unlocked: a metallic-accented "digital asset" card with the stamp's
//              unique UID and acquisition timestamp, styled like a foil
//              postage stamp with a perforated edge.
export default function StampCard({ stamp }) {
  if (!stamp.collected) {
    return (
      <div className="aspect-[3/4] rounded-lg bg-charcoal-soft border border-charcoal-line flex flex-col items-center justify-center gap-2 relative overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-14 h-14 opacity-20">
          <path
            d="M25 70 L25 50 L35 50 L35 40 L45 40 L45 50 L55 50 L55 40 L65 40 L65 50 L75 50 L75 70 Z"
            fill="currentColor"
            className="text-parchment"
          />
        </svg>
        <p className="text-[11px] text-parchment/30 font-medium">{stamp.fortName}</p>
        <p className="text-[10px] text-parchment/20">Not yet collected</p>
      </div>
    );
  }

  return (
    <Link
      to={`/app/stamp/${stamp.id}/share`}
      className="aspect-[3/4] rounded-lg kraft-surface perforated shadow-stamp relative flex flex-col justify-between p-3 border border-gold-dim/40"
    >
      <div className="flex justify-between items-start">
        <span className="text-[9px] font-mono text-forest-deep/60">SERIES 01</span>
        <span className="text-[9px] font-mono foil-text">★</span>
      </div>
      <div className="text-center">
        <p className="font-display text-sm text-charcoal leading-tight">{stamp.fortName}</p>
      </div>
      <div>
        <p className="text-[8px] font-mono text-forest-deep/50 truncate">{stamp.uid}</p>
        <p className="text-[8px] font-mono text-forest-deep/40">{stamp.acquiredLabel}</p>
      </div>
    </Link>
  );
}
