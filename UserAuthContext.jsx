import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Trekkers use Supabase's native phone-OTP auth. This is intentionally the
// *only* place in the app that touches `supabase.auth` — the manager flow
// never does, so the two identity systems can't cross-contaminate.

const UserAuthContext = createContext(null);

export function UserAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendOtp(phone) {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  }

  async function verifyOtp(phone, token) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) throw error;
    return data.session;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <UserAuthContext.Provider
      value={{ session, user: session?.user ?? null, loading, sendOtp, verifyOtp, logout }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export function useUserAuth() {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
}
