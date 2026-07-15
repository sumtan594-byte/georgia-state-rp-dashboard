import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import LoginScreen from '../components/auth/LoginScreen';
import { AuthSkeleton } from '../components/SkeletonLoader';
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
    return <AuthSkeleton />;
  }

  return (
    <>
      <Head>
        <title>Sign In, GSRP Dashboard</title>
      </Head>
      <LoginScreen />
    </>
  );
}
