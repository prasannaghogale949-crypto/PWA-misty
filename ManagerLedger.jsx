import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useManagerAuth } from "../../context/ManagerAuthContext.jsx";

const COMMISSION_PER_STAMP = Number(import.meta.env.VITE_COMMISSION_PER_STAMP ?? 70);

export default function ManagerLedger() {
  const { manager } = useManagerAuth();
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingCommission, setPendingCommission] = useState(0);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      // `manager_ledger_summary` is a Postgres view scoped by RLS to the
      // calling manager's own store — see supabase/schema.sql.
      const { data, error } = await supabase
        .from("manager_ledger_summary")
        .select("*")
        .eq("manager_id", manager.managerId)
        .single();
      if (!cancelled && !error && data) {
        setTodayCount(data.stamps_activated_today);
        setPendingCommission(data.pending_commission_inr);
        setLowStock(data.low_stock_forts ?? []);
      }
      if (!cancelled) setLoading(false);
    }
    load();

    // Live-update as scans come in from this device or others at the store.
    const channel = supabase
      .channel(`ledger-${manager.managerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `manager_id=eq.${manager.managerId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [manager.managerId]);

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Activated today" value={loading ? "—" : todayCount} accent="gold" />
        <StatCard
          label="Pending commission"
          value={loading ? "—" : `₹${pendingCommission.toLocaleString("en-IN")}`}
          accent="forest"
        />
      </div>

      <div className="rounded-xl border border-charcoal-line bg-charcoal-soft p-4">
        <p className="text-xs text-parchment/40 mb-1">Commission rate</p>
        <p className="text-parchment text-sm">₹{COMMISSION_PER_STAMP} per activated stamp</p>
      </div>

      <div className="rounded-xl border border-charcoal-line bg-charcoal-soft p-4">
        <p className="font-display text-lg text-parchment mb-3">Inventory alerts</p>
        {loading ? (
          <p className="text-sm text-parchment/40">Loading…</p>
        ) : lowStock.length === 0 ? (
          <p className="text-sm text-parchment/50">All series well-stocked.</p>
        ) : (
          <ul className="space-y-2">
            {lowStock.map((item) => (
              <li key={item.fort_name} className="flex justify-between text-sm">
                <span className="text-parchment/80">{item.fort_name}</span>
                <span className="text-rust font-medium">{item.remaining} left</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  const border = accent === "gold" ? "border-gold-dim" : "border-forest";
  return (
    <div className={`rounded-xl border ${border} bg-charcoal-soft p-4`}>
      <p className="text-xs text-parchment/40 mb-1">{label}</p>
      <p className="font-display text-2xl text-parchment">{value}</p>
    </div>
  );
}
