import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import PublicSite from "./public/PublicSite";
import SeoMetadata from "./public/SeoMetadata";
import AnalyticsTracker from "./core/AnalyticsTracker";
import IdleScreensaver from "./public/screensaver/IdleScreensaver";
// Private pages (and Firebase Auth) load on demand, keeping them out of the public bundle.
const PrivateLayout = lazy(() => import("./auth/PrivateLayout"));
const SignIn = lazy(() => import("./auth/SignIn"));
const Protected = lazy(() => import("./auth/Protected"));
const ContactInbox = lazy(() => import("./contact/ContactInbox"));
const StaffProtected = lazy(() => import("./auth/StaffProtected"));
const Dashboard = lazy(() => import("./auth/Dashboard"));
const PartyList = lazy(() => import("./party/PartyList"));
const PartyForm = lazy(() => import("./party/PartyForm"));
const PartyDetail = lazy(() => import("./party/PartyDetail"));
const CheckIn = lazy(() => import("./party/CheckIn"));
const Summary = lazy(() => import("./party/Summary"));
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"; }, []); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
export default function App() { return <><SeoMetadata /><AnalyticsTracker /><ScrollToTop /><Routes>
  <Route element={<Suspense fallback={<main className="center-state">Opening your Uniquem workspace…</main>}><PrivateLayout /></Suspense>}>
    <Route path="/signin" element={<SignIn />} />
    <Route element={<Protected />}><Route path="/contact-inbox" element={<ContactInbox />} /></Route>
    <Route element={<StaffProtected />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/party" element={<PartyList />} /><Route path="/party/new" element={<PartyForm />} />
      <Route path="/party/:partyId" element={<PartyDetail />} /><Route path="/party/:partyId/edit" element={<PartyForm />} />
      <Route path="/party/:partyId/check-in" element={<CheckIn />} /><Route path="/party/:partyId/summary" element={<Summary />} />
    </Route>
  </Route>
  <Route path="/" element={<PublicSite />} /><Route path="/about-us" element={<PublicSite />} /><Route path="/chemicals" element={<PublicSite />} /><Route path="/chemicals/*" element={<PublicSite />} /><Route path="/contact-us" element={<PublicSite />} /><Route path="/service-areas/alberta" element={<PublicSite />} />
  <Route path="*" element={<PublicSite notFound />} />
</Routes><IdleScreensaver /></>; }
