/**
 * Layout for unauthenticated routes (login, auth/verify).
 * Auth check is intentionally NOT performed here — this route group
 * is for pages that should be accessible without a session.
 * Auth enforcement happens at the (app) route group layout level.
 *
 * Each page in this group manages its own full-page layout
 * (e.g. split-screen for login, centered card for verify).
 */
export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
