import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import LoginScreen from '../../components/auth/LoginScreen';

export default function TrainingPage() {
  const { data: session, status } = useSession();
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);
  const sessionSent = useRef(false);

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
      }, '*');
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

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Training</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;

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
  const { getSession } = require("next-auth/react");
  const session = await getSession(context);
  if (!session) return { props: {} };

  const hasRole = session.user?.roles?.includes('1372476380096237609');
  const isAdmin = (process.env.ADMIN_USER_IDS || '').split(',').includes(session.user?.id);
  if (!hasRole && !isAdmin) return { redirect: { destination: '/', permanent: false } };

  return { props: {} };
}
