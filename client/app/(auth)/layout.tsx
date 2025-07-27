'use client';
import { GoogleOAuthProvider } from '@react-oauth/google';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
      <div className="min-h-screen">{children}</div>
    </GoogleOAuthProvider>
  );
}