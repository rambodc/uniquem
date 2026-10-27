/** Where to go after sign-in: the dashboard, unless a known private page was asked for (?next=). */
export function safeNext(value: string | null) { return value && /^\/(dashboard|contact-inbox|party)(\/[A-Za-z0-9_-]+){0,2}$/.test(value) ? value : "/dashboard"; }
