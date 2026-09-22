import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import PublicSite from "./public/PublicSite";
import SignIn from "./auth/SignIn";
import ContactInbox from "./contact/ContactInbox";
import Protected from "./auth/Protected";
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"; }, []); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
export default function App() { return <AuthProvider><ScrollToTop /><Routes>
  <Route path="/signin" element={<SignIn />} />
  <Route element={<Protected />}><Route path="/contact-inbox" element={<ContactInbox />} /></Route>
  <Route path="/" element={<PublicSite />} /><Route path="/about-us" element={<PublicSite />} /><Route path="/chemicals" element={<PublicSite />} /><Route path="/chemicals/*" element={<PublicSite />} /><Route path="/contact-us" element={<PublicSite />} /><Route path="/service-areas/alberta" element={<PublicSite />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes></AuthProvider>; }
