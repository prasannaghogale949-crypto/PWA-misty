import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUserAuth } from "../../context/UserAuthContext.jsx";
import { supabase } from "../../lib/supabaseClient";

export default function UserAuth() {
  const { sendOtp, verifyOtp } = useUserAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("phone"); // phone -> otp
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSendOtp(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await sendOtp(phone.trim());
      setStage("otp");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await verifyOtp(phone.trim(), otp.trim());
      // If they arrived here mid-scan, finish claiming the pending stamp.
      const pending = sessionStorage.getItem("mm_pending_claim");
      if (params.get("next") === "claim" && pending) {
        const { code } = JSON.parse(pending);
        sessionStorage.removeItem("mm_pending_claim");
        await supabase.rpc("verify_summit", {
          p_qr_code: code,
          p_user_id: session.user.id,
        });
      }
      navigate("/app/vault", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen kraft-surface flex flex-col justify-center px-6">
      <div className="max-w-sm mx-auto w-full">
        <h1 className="font-display text-3xl text-charcoal mb-2">
          {stage === "phone" ? "One last step" : "Enter the code"}
        </h1>
        <p className="text-forest-deep/70 text-sm mb-8">
          {stage === "phone"
            ? "We'll text you a code to save this stamp to your Vault."
            : `Sent to ${phone}`}
        </p>

        {stage === "phone" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input
              type="tel"
              inputMode="numeric"
              required
              autoFocus
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full rounded-lg bg-parchment border border-kraft-dark px-4 py-3 text-charcoal outline-none focus:border-forest"
            />
            {error && <p className="text-rust text-sm">{error}</p>}
            <button
              disabled={busy || !phone}
              className="w-full rounded-lg bg-charcoal text-parchment font-semibold py-3 disabled:opacity-40"
            >
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              className="w-full rounded-lg bg-parchment border border-kraft-dark px-4 py-3 text-charcoal tracking-[0.4em] text-center outline-none focus:border-forest"
            />
            {error && <p className="text-rust text-sm">{error}</p>}
            <button
              disabled={busy || otp.length !== 6}
              className="w-full rounded-lg bg-charcoal text-parchment font-semibold py-3 disabled:opacity-40"
            >
              {busy ? "Verifying…" : "Verify & continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
