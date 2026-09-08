import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useUserAuth } from "../../context/UserAuthContext.jsx";
import StampCard from "../../components/shared/StampCard.jsx";

// Series 01 fort roster is fetched from `series` + left-joined against the
// trekker's own `user_stamps` so uncollected forts still render (locked)
// even before the trekker has scanned anything.
export default function UserVault() {
  const { user } = useUserAuth();
  const [stamps, setStamps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase.rpc("get_vault", {
        p_user_id: user?.id ?? null,
        p_series_slug: "forts-and-bastions-01",
      });
      if (!cancelled && !error && data) {
        setStamps(
          data.map((row) => ({
            id: row.stamp_id,
            fortName: row.fort_name,
            collected: row.collected,
            uid: row.qr_code,
            acquiredLabel: row.acquired_at
              ? new Date(row.acquired_at).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null,
          }))
        );
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const collectedCount = stamps.filter((s) => s.collected).length;

  return (
    <div className="p-4">
      <div className="mb-5">
        <p className="text-gold text-xs font-medium tracking-wide mb-1">Series 01</p>
        <h1 className="font-display text-2xl text-parchment">Forts &amp; Bastions</h1>
        <p className="text-sm text-parchment/50 mt-1">
          {collectedCount} of {stamps.length || "…"} summits collected
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-lg bg-charcoal-soft animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {stamps.map((s) => (
            <StampCard key={s.id ?? s.fortName} stamp={s} />
          ))}
        </div>
      )}
    </div>
  );
}
