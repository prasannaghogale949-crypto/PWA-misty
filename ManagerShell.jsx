import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useManagerAuth } from "../../context/ManagerAuthContext.jsx";

const tabs = [
  { to: "/manager/scan", label: "Scan" },
  { to: "/manager/ledger", label: "Ledger" },
  { to: "/manager/resources", label: "Resources" },
];

export default function ManagerShell() {
  const { manager, logout } = useManagerAuth();

  return (
    <div className="min-h-screen bg-forest-deep flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-charcoal-line">
        <div>
          <p className="font-display text-lg text-parchment leading-none">
            {manager?.storeName ?? "Partner Store"}
          </p>
          <p className="text-[11px] text-parchment/40 mt-0.5">{manager?.phone}</p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-parchment/50 border border-charcoal-line rounded-full px-3 py-1.5"
        >
          Sign out
        </button>
      </header>

      <nav className="flex border-b border-charcoal-line">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex-1 text-center py-3 text-sm font-medium ${
                isActive
                  ? "text-gold-bright border-b-2 border-gold-bright"
                  : "text-parchment/50"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
