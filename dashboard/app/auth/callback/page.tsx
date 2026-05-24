'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authorization was denied. Please try again.');
      return;
    }

    if (!code) {
      setError('No authorization code received.');
      return;
    }

    // Exchange code for token via our API
    async function exchangeCode(authCode: string) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: authCode }),
        });

        if (!response.ok) {
          throw new Error('Failed to exchange authorization code');
        }

        const data = await response.json();

        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to dashboard
        router.push('/dashboard/' + (data.guilds?.[0]?.id || ''));
      } catch (err) {
        setError('Authentication failed. Please try again.');
        console.error('Auth callback error:', err);
      }
    }

    exchangeCode(code);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-darkest">
        <div className="card max-w-md w-full text-center space-y-4">
          <div className="text-discord-red text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-white">Authentication Error</h2>
          <p className="text-gray-400">{error}</p>
          <a href="/" className="btn-primary inline-block">
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-discord-darkest">
      <div className="card max-w-md w-full text-center space-y-4">
        <div className="animate-spin w-8 h-8 border-4 border-discord-blurple border-t-transparent rounded-full mx-auto" />
        <h2 className="text-xl font-bold text-white">Authenticating...</h2>
        <p className="text-gray-400">Please wait while we verify your Discord account.</p>
      </div>
    </div>
  );
}
