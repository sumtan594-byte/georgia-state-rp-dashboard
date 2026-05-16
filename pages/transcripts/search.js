import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Search, FileText, Loader2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-options';

export default function TranscriptSearchPage() {
  const { status } = useSession();
  const { refreshedUser } = useRefreshedUser();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [searched, setSearched] = useState(false);
  const pageSize = 20;

  const doSearch = useCallback(async (searchQuery, searchPage = 0) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/transcripts/search?q=${encodeURIComponent(searchQuery.trim())}&limit=${pageSize}&offset=${searchPage * pageSize}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotal(data.total || 0);
        setPage(searchPage);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(query, 0);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Search className="w-7 h-7 text-gsrp-orange" />
          Search Transcripts
        </h1>
        <p className="text-gray-400 text-sm mt-1">Search across all transcript message content</p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full bg-gsrp-dark-card border border-gsrp-dark-border rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-gsrp-orange/50"
              minLength={2}
            />
          </div>
          <button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="px-6 py-3 bg-gsrp-orange hover:bg-gsrp-orange/80 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin" />
        </div>
      ) : searched && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="w-12 h-12 text-gray-600 mb-4" />
          <p className="text-gray-400">No transcripts found matching your search</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">{total} result{total !== 1 ? 's' : ''} found</p>
          <div className="space-y-2">
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/transcript/${result.id}`}
                className="flex items-center gap-4 p-4 bg-gsrp-dark-card/50 border border-gsrp-dark-border/50 rounded-xl hover:border-gsrp-orange/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gsrp-orange/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-gsrp-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate group-hover:text-gsrp-orange transition-colors">
                    {result.channel_name || `Transcript #${result.id}`}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {result.closed_at ? new Date(result.closed_at).toLocaleDateString() : 'Unknown'}
                    </span>
                    {result.type && (
                      <span className="text-xs text-gray-500 bg-gsrp-dark-surface px-2 py-0.5 rounded">
                        {result.type}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gsrp-orange transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => doSearch(query, page - 1)}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-gsrp-dark-card border border-gsrp-dark-border rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-gsrp-orange/50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => doSearch(query, page + 1)}
                disabled={page >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-gsrp-dark-card border border-gsrp-dark-border rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed hover:border-gsrp-orange/50 transition-colors cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: '/login', permanent: false } };
  }

  return { props: {} };
}
