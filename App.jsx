import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { ManagerAuthProvider } from "./context/ManagerAuthContext.jsx";
import { UserAuthProvider } from "./context/UserAuthContext.jsx";

import ManagerLogin from "./routes/manager/ManagerLogin.jsx";
import ManagerShell from "./routes/manager/ManagerShell.jsx";
import ManagerScanner from "./routes/manager/ManagerScanner.jsx";
import ManagerLedger from "./routes/manager/ManagerLedger.jsx";
import ManagerResources from "./routes/manager/ManagerResources.jsx";
import RequireManager from "./routes/manager/RequireManager.jsx";

import UserAuth from "./routes/user/UserAuth.jsx";
import UserShell from "./routes/user/UserShell.jsx";
import UserScanner from "./routes/user/UserScanner.jsx";
import UserVault from "./routes/user/UserVault.jsx";
import SocialExport from "./routes/user/SocialExport.jsx";
import Marketplace from "./routes/user/Marketplace.jsx";
import Support from "./routes/user/Support.jsx";
import Landing from "./routes/Landing.jsx";

// The /manager subtree and the / (trekker) subtree are entirely separate
// route trees, each wrapped in its own auth provider. Nothing renders both
// providers' context at once, and no component imports across the boundary —
// that's what "entirely isolated" means here, not just separate URLs.

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route
        path="/manager/*"
        element={
          <ManagerAuthProvider>
            <Routes>
              <Route path="login" element={<ManagerLogin />} />
              <Route
                element={
                  <RequireManager>
                    <ManagerShell />
                  </RequireManager>
                }
              >
                <Route path="scan" element={<ManagerScanner />} />
                <Route path="ledger" element={<ManagerLedger />} />
                <Route path="resources" element={<ManagerResources />} />
                <Route index element={<Navigate to="scan" replace />} />
              </Route>
            </Routes>
          </ManagerAuthProvider>
        }
      />

      <Route
        path="/app/*"
        element={
          <UserAuthProvider>
            <Routes>
              <Route path="auth" element={<UserAuth />} />
              <Route element={<UserShell />}>
                <Route path="scan" element={<UserScanner />} />
                <Route path="vault" element={<UserVault />} />
                <Route path="stamp/:stampId/share" element={<SocialExport />} />
                <Route path="shop" element={<Marketplace />} />
                <Route path="support" element={<Support />} />
                <Route index element={<Navigate to="vault" replace />} />
              </Route>
            </Routes>
          </UserAuthProvider>
        }
      />
    </Routes>
  );
}
