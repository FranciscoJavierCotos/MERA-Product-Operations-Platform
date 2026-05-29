/**
 * Public portal layout — no auth, no app chrome (navbar/sidebar).
 *
 * The portal is always dark regardless of the staff `next-themes` preference:
 * the design tokens are defined on the `.dark` selector, so forcing the class
 * on this wrapper makes every descendant resolve dark values. External clients
 * have no theme toggle.
 */
export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark portal-bg portal-grid min-h-screen text-foreground antialiased">
      {children}
    </div>
  );
}
