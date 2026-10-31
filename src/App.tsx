import { Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import PublicSite from "./public/PublicSite";
import SeoMetadata from "./public/SeoMetadata";
import AnalyticsTracker from "./core/AnalyticsTracker";
import IdleScreensaver from "./public/screensaver/IdleScreensaver";
import ErrorBoundary from "./core/ErrorBoundary";
import { lazyWithReload as lazy } from "./core/resilience";
import { isNativeApp } from "./native/platform";
import LoadingScreen from "./auth/LoadingScreen";
// Private pages (and Firebase Auth) load on demand, keeping them out of the public bundle. If a chunk is gone after a deploy, the page reloads once.
const PrivateLayout = lazy(() => import("./auth/PrivateLayout"));
const SignIn = lazy(() => import("./auth/SignIn"));
const ContactInbox = lazy(() => import("./contact/ContactInbox"));
const RequireMiniApp = lazy(() => import("./auth/RequireMiniApp"));
const Dashboard = lazy(() => import("./auth/Dashboard"));
const PartyList = lazy(() => import("./party/PartyList"));
const PartyForm = lazy(() => import("./party/PartyForm"));
const PartyDetail = lazy(() => import("./party/PartyDetail"));
const CheckIn = lazy(() => import("./party/CheckIn"));
const UsersApp = lazy(() => import("./users/UsersApp"));
const ProfileApp = lazy(() => import("./profile/ProfileApp"));
const NativeApp = lazy(() => import("./native/NativeApp"));
const SafetyHome = lazy(() => import("./safety/SafetyHome"));
const SafetyLessonPage = lazy(() => import("./safety/SafetyLesson"));
const SafetyProgressPage = lazy(() => import("./safety/SafetyProgress"));
function SummaryRedirect() { const { partyId = "" } = useParams(); return <Navigate to={`/party/${partyId}`} replace />; }
function ScrollToTop() { const { pathname } = useLocation(); useEffect(() => { if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"; }, []); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
export default function App() { const { pathname } = useLocation(); return <><SeoMetadata /><AnalyticsTracker /><ScrollToTop /><ErrorBoundary resetKey={pathname}><Routes>
  <Route element={<Suspense fallback={<LoadingScreen />}><PrivateLayout /></Suspense>}>
    <Route path="/signin" element={<SignIn />} />
    <Route element={<RequireMiniApp />}><Route path="/dashboard" element={<Dashboard />} /></Route>
    <Route element={<RequireMiniApp app="contact" />}><Route path="/contact-inbox" element={<ContactInbox />} /></Route>
    <Route element={<RequireMiniApp app="party" />}>
      <Route path="/party" element={<PartyList />} /><Route path="/party/new" element={<PartyForm />} />
      <Route path="/party/:partyId" element={<PartyDetail />} /><Route path="/party/:partyId/edit" element={<PartyForm />} />
      <Route path="/party/:partyId/check-in" element={<CheckIn />} /><Route path="/party/:partyId/summary" element={<SummaryRedirect />} />
    </Route>
    <Route element={<RequireMiniApp app="safety" />}>
      <Route path="/safety" element={<SafetyHome />} /><Route path="/safety/lesson/:lessonId" element={<SafetyLessonPage />} /><Route path="/safety/progress" element={<SafetyProgressPage />} />
    </Route>
    <Route element={<RequireMiniApp app="users" />}><Route path="/users" element={<UsersApp />} /></Route>
    <Route element={<RequireMiniApp app="profile" />}><Route path="/profile" element={<ProfileApp />} /></Route>
  </Route>
  <Route path="/" element={<PublicSite />} /><Route path="/about-us" element={<PublicSite />} /><Route path="/chemicals" element={<PublicSite />} /><Route path="/chemicals/*" element={<PublicSite />} /><Route path="/contact-us" element={<PublicSite />} /><Route path="/service-areas/alberta" element={<PublicSite />} />
  <Route path="*" element={<PublicSite notFound />} />
</Routes></ErrorBoundary><IdleScreensaver />{isNativeApp() && <Suspense fallback={null}><NativeApp /></Suspense>}</>; }
