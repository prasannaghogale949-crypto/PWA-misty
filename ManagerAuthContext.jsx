import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Managers authenticate with phone + a 4-digit PIN issued at partner
// onboarding — never shares a session, table, or auth namespace with the
// trekker (user) flow. We call a Postgres RPC (`manager_login`) that checks
// the PIN server-side (hashed) and returns a short-lived manager session
// token, which we store separately from Supabase's own `auth` session so a
// store tablet logged in as a manager can never accidentally inherit or leak
// a trekker's session.

const ManagerAuthContext = createContext(null);

const STORAGE_KEY = "mm_manager_session";

export function ManagerAuthProvider({ children }) {
  const [manager, setManager] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setManager(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function loginWithPin(phone, pin) {
    const { data, error } = await supabase.rpc("manager_login", {
      p_phone: phone,
      p_pin: pin,
    });
    if (error) throw error;
    if (!data) throw new Error("Invalid phone or PIN.");

    const session = {
      managerId: data.manager_id,
      storeName: data.store_name,
      phone,
      token: data.session_token,
      expiresAt: data.expires_at,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setManager(session);
    return session;
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setManager(null);
  }

  return (
    <ManagerAuthContext.Provider value={{ manager, loading, loginWithPin, logout }}>
      {children}
    </ManagerAuthContext.Provider>
  );
}

export function useManagerAuth() {
  const ctx = useContext(ManagerAuthContext);
  if (!ctx) throw new Error("useManagerAuth must be used within ManagerAuthProvider");
  return ctx;
}
