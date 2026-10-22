// Google Analytics 4 measurement ID for uniquem.ca.
// Analytics stays completely OFF (no script, no requests) while this is empty.
// To turn it on, either paste the ID here (format "G-XXXXXXXXXX") or set the
// VITE_GA_MEASUREMENT_ID variable in the GitHub "Prod" environment; the env
// value wins when both are set. The ID is public (it is visible in page source).
export const GA_MEASUREMENT_ID_DEFAULT = "G-1DLVMZX18M";

// Extra Google Search Console "HTML tag" verification codes (just the content
// value, e.g. "abc123..."). The existing verification tag in index.html stays.
// Codes can also be supplied as a comma-separated VITE_SEARCH_CONSOLE_VERIFICATION.
// For the "HTML file" method instead, drop Google's googleXXXX.html file into public/.
export const SEARCH_CONSOLE_VERIFICATION_CODES: readonly string[] = [];
