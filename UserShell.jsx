import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/app/vault", label: "Vault", icon: "◆" },
  { to: "/app/scan", label: "Scan", icon: "⛰" },
  { to: "/app/shop", label: "Shop", icon: "◈" },
  { to: "/app/support", label: "Support", icon: "✎" },
];

export default function UserShell() {
  return (
    <div className="min-h-screen bg-charcoal flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-charcoal-soft border-t border-charcoal-line flex safe-area-bottom">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 ${
                isActive ? "text-gold-bright" : "text-parchment/40"
              }`
            }
          >
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="text-[10px] font-medium">{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
