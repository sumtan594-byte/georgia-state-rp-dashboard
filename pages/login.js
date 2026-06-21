import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import LoginScreen from '../components/auth/LoginScreen';
import Head from 'next/head';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-gsrp-orange/20 border-t-gsrp-orange rounded-full animate-spin mb-4" />
          <span className="text-gsrp-teal-light/50 font-mono text-[9px] uppercase tracking-[0.3em]">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sign In — GSRP Dashboard</title>
      </Head>
      <LoginScreen />
    </>
  );
}
