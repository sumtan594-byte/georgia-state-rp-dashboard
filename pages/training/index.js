import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';
import LoginScreen from '../../components/auth/LoginScreen';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';

export default function TrainingPage() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const effectiveSession = refreshedSession || session;
  const [loaded, setLoaded] = useState(false);
  const [progressChecked, setProgressChecked] = useState(false);
  const [checkingProgress, setCheckingProgress] = useState(true);
  const iframeRef = useRef(null);
  const sessionSent = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') return;
    if (!hasRefreshed || !effectiveSession) return;
    if (accessDenied) return;

    async function checkProgress() {
      try {
        const res = await fetch('/api/training/progress');
        const data = await res.json();
        if (!data.handbookCompleted) {
          router.push('/training/handbook');
        } else {
          setProgressChecked(true);
        }
      } catch (e) {
        console.error('Progress check failed', e);
        router.push('/training/handbook');
      } finally {
        setCheckingProgress(false);
      }
    }
    checkProgress();
  }, [status, hasRefreshed, effectiveSession, accessDenied, router]);

  const sendSessionToIframe = useCallback(() => {
    if (iframeRef.current && session && !sessionSent.current) {
      iframeRef.current.contentWindow.postMessage({
        type: 'GSRP_AUTH',
        payload: {
          id: session.user.id,
          username: session.user.name,
          global_name: session.user.name,
          avatar: session.user.avatar,
          isTrainer: session.user.roles?.includes('1372482495035211908'),
        },
      }, window.location.origin);
      sessionSent.current = true;
    }
  }, [session]);

  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'GSRP_LOGOUT') {
        signOut({ callbackUrl: '/' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (loaded && session) {
      sendSessionToIframe();
    }
  }, [loaded, session, sendSessionToIframe]);

  if (status === 'loading' || checkingProgress || !hasRefreshed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Verifying Handbook Completion</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  if (accessDenied) {
    return <AccessDenied roleId={accessDenied.roleId} />;
  }

  return (
    <div className="w-full h-[calc(100vh-60px)] rounded-2xl overflow-hidden border border-gsrp-dark-border/50 animate-scale-in">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gsrp-dark/90 z-10">
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
            <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Training Module</span>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src="/training.html"
        className="w-full h-full border-0"
        onLoad={() => {
          setLoaded(true);
          sendSessionToIframe();
        }}
        title="GSRP Staff Training"
      />
    </div>
  );
}

export async function getServerSideProps(context) {
  const { isFullAdmin } = await import('../../lib/admin-helper');
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372476380096237609');

  const isAdmin = await isFullAdmin(session.user?.id, session.user?.roles || []);

  if (!hasRole && !isAdmin) return { redirect: { destination: '/', permanent: false } };

  return { props: {} };
}
