import React from "react";

const STEPS = [
  {
    title: "Open the scanner",
    body: "Tap Scan in the bottom bar as soon as a trekker pays for their stamp.",
  },
  {
    title: "Frame the QR code",
    body: "Hold the stamp flat, about 15cm from the camera, inside the gold square.",
  },
  {
    title: "Confirm and hand it over",
    body: "Wait for the green confirmation before handing the stamp to the trekker — that's what logs your commission.",
  },
];

export default function ManagerResources() {
  return (
    <div className="p-4 space-y-6">
      <section>
        <p className="font-display text-lg text-parchment mb-3">
          3-step scanning guide
        </p>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-3 rounded-xl border border-charcoal-line bg-charcoal-soft p-4"
            >
              <span className="font-display text-gold-bright text-lg">{i + 1}</span>
              <div>
                <p className="text-parchment font-medium text-sm">{s.title}</p>
                <p className="text-parchment/60 text-sm mt-0.5">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-charcoal-line bg-charcoal-soft p-4">
        <p className="font-display text-lg text-parchment mb-2">Commission contract</p>
        <p className="text-sm text-parchment/70 leading-relaxed">
          Your store earns ₹70 for every stamp activated at your counter. Commission is
          calculated from confirmed activations only — duplicate or invalid scans are never
          counted. Payouts are reconciled monthly against your ledger; contact your
          onboarding manager for the full signed agreement and payout schedule.
        </p>
      </section>
    </div>
  );
}
