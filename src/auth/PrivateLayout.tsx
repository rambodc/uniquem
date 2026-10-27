import { Outlet } from "react-router-dom";
import { AuthProvider } from "./AuthContext";

/** Wraps only the private routes (/signin, /contact-inbox, /dashboard, /party), so Firebase Auth is
 * loaded on demand and never in the bundle public visitors download. */
export default function PrivateLayout() { return <AuthProvider><Outlet /></AuthProvider>; }
