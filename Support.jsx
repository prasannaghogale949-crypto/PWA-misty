import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useUserAuth } from "../../context/UserAuthContext.jsx";

export default function Support() {
  const { user } = useUserAuth();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    await supabase.from("support_tickets").insert({
      user_id: user?.id ?? null,
      message: message.trim(),
    });
    setBusy(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="p-6 text-center pt-20">
        <p className="font-display text-xl text-parchment mb-2">Got it.</p>
        <p className="text-sm text-parchment/60">
          We'll follow up over your registered number within 2 working days.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="font-display text-2xl text-parchment mb-2">Missing something?</h1>
      <p className="text-sm text-parchment/50 mb-4">
        Missing stamp, damaged kit, or a scan that didn't go through — tell us what happened.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="What went wrong?"
          className="w-full rounded-lg bg-charcoal-soft border border-charcoal-line px-4 py-3 text-parchment placeholder:text-parchment/30 outline-none focus:border-gold"
        />
        <button
          disabled={busy || !message.trim()}
          className="w-full rounded-lg bg-gold-foil text-charcoal font-semibold py-3 disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
