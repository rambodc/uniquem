/** The one message shown after asking for a password reset, whether or not an account exists for that email (so nobody can use the form to find out who has an account). */
export const RESET_SENT = "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder; the link works for about an hour.";
/** Where the reset link sends people afterwards. */
export const RESET_CONTINUE_URL = "https://uniquem.ca/signin";

const codeOf = (error: unknown) => typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";

/** What to show for a failed sign-in. Firebase's own wording is never shown, and no message says whether the email exists. */
export function signInErrorMessage(error: unknown): string {
  const code = codeOf(error);
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a few minutes or reset your password.";
  if (code === "auth/network-request-failed") return "No connection. Check your internet and try again.";
  if (code.startsWith("auth/")) return "Sign in failed. Check your email and password.";
  return error instanceof Error && error.message ? error.message : "Sign in failed. Check your email and password.";
}

/** What to show when the server could not be asked what this account may open. Never "not authorized": that is only for a real answer. */
export function accessErrorMessage(error: unknown): string {
  const code = codeOf(error);
  if (code === "functions/unauthenticated") return "This device could not be verified by the Uniquem server. Update the app and try again.";
  if (["functions/unavailable", "functions/deadline-exceeded", "auth/network-request-failed"].includes(code) || /network|offline|timed out/i.test(String((error as Error)?.message ?? ""))) return "No connection to the Uniquem server. Check your internet and try again.";
  return "Your access could not be checked right now. Try again.";
}
/** The answer when the server says this account has no access. */
export const NOT_AUTHORIZED = "This account is not authorized for the Uniquem workspace.";

/** The outcome of asking for a reset link: "sent" for success and for an unknown account alike, otherwise an error to show. */
export function resetOutcome(error: unknown): { sent: true } | { sent: false; message: string } {
  if (error === undefined) return { sent: true };
  switch (codeOf(error)) {
    case "auth/user-not-found": return { sent: true };
    case "auth/invalid-email": return { sent: false, message: "Enter a valid email address." };
    case "auth/too-many-requests": return { sent: false, message: "Too many requests. Wait a few minutes and try again." };
    case "auth/network-request-failed": return { sent: false, message: "No connection. Check your internet and try again." };
    default: return { sent: false, message: "The reset link could not be requested. Try again." };
  }
}
