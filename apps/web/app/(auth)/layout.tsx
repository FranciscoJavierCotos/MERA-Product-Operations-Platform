export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-bg min-h-screen flex items-center justify-center bg-gray-100 dark:bg-background">
      <div className="max-w-md w-full">{children}</div>
    </div>
  );
}
