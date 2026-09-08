import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useManagerAuth } from "../../context/ManagerAuthContext.jsx";

export default function ManagerLogin() {
  const { loginWithPin } = useManagerAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await loginWithPin(phone.trim(), pin.trim());
      navigate("/manager/scan", { replace: true });
    } catch (err) {
      setError(err.message || "Couldn't sign in. Check your phone and PIN.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-forest-deep flex flex-col justify-center px-6">
      <div className="max-w-sm mx-auto w-full">
        <p className="text-gold text-xs tracking-wide font-medium mb-1">
          Partner Store Portal
        </p>
        <h1 className="font-display text-3xl text-parchment mb-8">
          Sign in to activate stamps
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm text-parchment/70 mb-1">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98XXXXXX21"
              className="w-full rounded-lg bg-charcoal-soft border border-charcoal-line px-4 py-3 text-parchment placeholder:text-parchment/30 focus:border-gold outline-none"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm text-parchment/70 mb-1">
              4-digit PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="••••"
              className="w-full rounded-lg bg-charcoal-soft border border-charcoal-line px-4 py-3 text-parchment tracking-[0.6em] text-center text-xl focus:border-gold outline-none"
            />
          </div>

          {error && <p className="text-rust text-sm">{error}</p>}

          <button
            type="submit"
            disabled={busy || pin.length !== 4 || !phone}
            className="w-full rounded-lg bg-gold-foil text-charcoal font-semibold py-3 shadow-embossed disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-parchment/40 mt-6">
          Don't have a PIN? Contact your MistyMonoliths onboarding manager.
        </p>
      </div>
    </div>
  );
}
