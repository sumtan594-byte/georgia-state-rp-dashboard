import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { 
  FileText, 
  ChevronRight, 
  Loader2, 
  UserPlus 
} from 'lucide-react';
import Link from 'next/link';
import { PageSkeleton } from '../../components/SkeletonLoader';

import { hasRole } from '../../lib/auth';

const FALLBACK_TYPE = {
  name: 'Staff Application',
  slug: 'staff',
  description: 'Apply to join the Georgia State Roleplay staff team.',
};

export default function ApplicationList({ initialTypes = [FALLBACK_TYPE] }) {
  const { data: session, status } = useSession();
  const [types, setTypes] = useState(initialTypes.length ? initialTypes : [FALLBACK_TYPE]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;

    setLoading(true);
    setError(null);
    fetch('/api/applications/types')
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) {
            setTypes([]);
            setError('Application types are temporarily unavailable.');
            return;
          }
          // If no staff app exists, add a placeholder
          const hasStaff = data.find(t => t.slug === 'staff');
          if (!hasStaff) {
             data.unshift({
                name: 'Staff Application',
                slug: 'staff',
                description: 'Apply to join the Georgia State Roleplay staff team'
             });
          }
          
          // Filter by role
          const visibleTypes = data.filter(type => {
            const blacklisted = Array.isArray(type.blacklistedRole)
              ? type.blacklistedRole
              : (type.blacklistedRole ? [type.blacklistedRole] : []);

            if (blacklisted.some(roleId => hasRole(session, roleId))) {
              return false;
            }

            if (!type.requiredRole || (Array.isArray(type.requiredRole) && type.requiredRole.length === 0)) return true;
            const required = Array.isArray(type.requiredRole) ? type.requiredRole : [type.requiredRole];
            return required.some(roleId => hasRole(session, roleId));
          });

          setTypes(visibleTypes);
        })
        .catch(() => {
          setTypes([]);
          setError('Failed to load applications. Please try again.');
        })
        .finally(() => setLoading(false));
  }, [session]);

  if (loading && types.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 animate-fade-in-up">
      <Head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Georgia State Roleplay Applications',
          itemListElement: types.map((type, index) => ({ '@type': 'ListItem', position: index + 1, name: type.name, url: `https://join-gsrp.com/apply/${type.slug}` })),
        }) }} />
      </Head>

      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-gsrp-teal-light/45">
        <Link href="/" className="hover:text-white">Home</Link><ChevronRight size={13} /><span>Applications</span>
      </nav>

      <div className="mb-10 rounded-3xl border border-white/10 bg-gsrp-dark-card/70 p-8 sm:p-10">
        <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-4">
          <UserPlus className="text-gsrp-orange" />
          Apply to Georgia State Roleplay
        </h1>
        <p className="text-gsrp-teal-light/65 leading-7 mt-5 max-w-3xl">Explore opportunities to join the GSRP staff team or an eligible department. Applications are reviewed by community leadership and may require activity, prior experience, training, or specific Discord roles.</p>
        <div className="mt-6 grid gap-3 text-sm text-gsrp-teal-light/60 sm:grid-cols-3">
          <p className="rounded-xl bg-white/5 p-4"><strong className="block text-white">1. Sign in</strong>Use your GSRP Discord account.</p>
          <p className="rounded-xl bg-white/5 p-4"><strong className="block text-white">2. Check eligibility</strong>Available forms match your roles.</p>
          <p className="rounded-xl bg-white/5 p-4"><strong className="block text-white">3. Apply carefully</strong>Submit original, detailed answers.</p>
        </div>
      </div>

      <h2 className="mb-6 font-display text-2xl font-bold text-white">Current application categories</h2>

      {error && (
        <div className="mb-6 rounded-2xl border border-gsrp-orange/20 bg-gsrp-orange/10 p-4 text-sm text-gsrp-orange/80">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {types.map(type => (
          <Link
            key={type.slug} 
            href={session ? `/apply/${type.slug}` : `/login?callbackUrl=${encodeURIComponent(`/apply/${type.slug}`)}`}
            className="bg-gsrp-dark-card border border-white/10 rounded-3xl p-8 group hover:border-gsrp-orange transition-all relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gsrp-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gsrp-orange/10 flex items-center justify-center text-gsrp-orange mb-6 group-hover:scale-110 transition-transform">
                <FileText />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gsrp-orange transition-colors">{type.name}</h3>
              <p className="text-gsrp-teal-light/60 text-sm mb-6 leading-relaxed">
                {type.description || `Apply for the ${type.name} department and help our community grow.`}
              </p>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gsrp-orange">
                {session ? 'Start application' : 'Sign in to check eligibility'} <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        ))}
        {!error && types.length === 0 && (
          <div className="md:col-span-2 rounded-3xl border border-dashed border-gsrp-dark-border bg-gsrp-dark-card/50 p-10 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-white/15" />
            <h2 className="mb-2 text-lg font-bold text-white/70">No Applications Open</h2>
            <p className="text-sm text-gsrp-teal-light/35">There are no application forms available for your current Discord roles.</p>
          </div>
        )}
      </div>
      {status !== 'authenticated' ? <p className="mt-8 text-center text-sm text-gsrp-teal-light/50">Application forms require Discord sign-in, but this overview is public and always available.</p> : null}
    </div>
  );
}

export async function getServerSideProps({ res }) {
  let initialTypes = [FALLBACK_TYPE];
  try {
    const { default: clientPromise } = await import('../../lib/mongodb');
    const client = await clientPromise;
    const docs = await client.db('gsrp_staff').collection('application_types')
      .find({}, { projection: { name: 1, slug: 1, description: 1 } })
      .sort({ name: 1 })
      .toArray();
    const safeTypes = docs
      .filter((type) => type.name && type.slug)
      .map((type) => ({ name: type.name, slug: type.slug, description: type.description || '' }));
    if (safeTypes.length) initialTypes = safeTypes;
  } catch (error) {
    console.error('[Applications SSR]', error.message);
  }
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
  return { props: { initialTypes } };
}
