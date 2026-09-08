import React from "react";

export default function Marketplace() {
  return (
    <div className="p-4">
      <h1 className="font-display text-2xl text-parchment mb-4">Shop</h1>
      <a
        href="https://mistymonoliths.myshopify.com/products/mohim-kit"
        target="_blank"
        rel="noreferrer"
        className="block rounded-xl kraft-surface p-4 border border-gold-dim/40"
      >
        <p className="font-display text-lg text-charcoal">The Mohim Kit</p>
        <p className="text-sm text-forest-deep/70 mt-1">
          Your A6 Kraft-paper passport, starter stamp, and trail patch — everything you need to
          start collecting.
        </p>
        <p className="text-sm font-semibold text-charcoal mt-3">₹499 →</p>
      </a>
    </div>
  );
}
