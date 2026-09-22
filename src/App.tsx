import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import PublicSite from "./public/PublicSite";
import SignIn from "./auth/SignIn";
import ContactInbox from "./contact/ContactInbox";
import Protected from "./auth/Protected";
export default function App() { return <AuthProvider><Routes>
  <Route path="/signin" element={<SignIn />} />
  <Route element={<Protected />}><Route path="/contact-inbox" element={<ContactInbox />} /></Route>
  <Route path="/" element={<PublicSite />} /><Route path="/about-us" element={<PublicSite />} /><Route path="/chemicals" element={<PublicSite />} /><Route path="/chemicals/*" element={<PublicSite />} /><Route path="/contact-us" element={<PublicSite />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes></AuthProvider>; }
