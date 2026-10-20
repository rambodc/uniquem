import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import PublicSite from "./public/PublicSite";
import SeoMetadata from "./public/SeoMetadata";
import SignIn from "./auth/SignIn";
import ContactInbox from "./contact/ContactInbox";
import Protected from "./auth/Protected";
const Logo3DTest = lazy(() => import("./test/Logo3DTest"));
const LogoFrontTest = lazy(() => import("./test/LogoFrontTest"));
import IdleScreensaver from "./test/screensaver/IdleScreensaver";
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"; }, []); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
export default function App() { return <AuthProvider><SeoMetadata /><ScrollToTop /><Routes>
  <Route path="/signin" element={<SignIn />} />
  <Route path="/test/logo-3d" element={<Suspense fallback={null}><Logo3DTest /></Suspense>} />
  <Route path="/test/logo-3d-front" element={<Suspense fallback={null}><LogoFrontTest /></Suspense>} />
  <Route element={<Protected />}><Route path="/contact-inbox" element={<ContactInbox />} /></Route>
  <Route path="/" element={<PublicSite />} /><Route path="/about-us" element={<PublicSite />} /><Route path="/chemicals" element={<PublicSite />} /><Route path="/chemicals/*" element={<PublicSite />} /><Route path="/contact-us" element={<PublicSite />} /><Route path="/service-areas/alberta" element={<PublicSite />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>{/* TEST BRANCH ONLY (logo-3d-test): idle screensaver, never merge to production. */}<IdleScreensaver /></AuthProvider>; }
