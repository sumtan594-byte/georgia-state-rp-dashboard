import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const UserRefreshContext = createContext(null);

const ROLE_MAP = {
  '1372476381115453550': { name: 'Panel', requiredFor: ['/panel', '/panel/stats', '/staff-handbook'] },
  '1372476380096237609': { name: 'Trainee', requiredFor: ['/training', '/training/handbook'] },
  '1372482495035211908': { name: 'Trainer', requiredFor: ['/training/attempts', '/training/analytics'] },
  '1372491512709124106': { name: 'Application Staff', requiredFor: ['/applications', '/applications/manage'] },
  '1486826723210428496': { name: 'Admin Manager', requiredFor: ['/admins'] },
};

const ROUTE_RULES = [
  { pattern: /^\/panel(\/.*)?$/, roles: ['1372476381115453550'] },
  { pattern: /^\/applications(\/.*)?$/, roles: ['1372491512709124106'] },
  { pattern: /^\/staff-handbook$/, roles: ['1372476381115453550', '1372476380096237609'] },
  { pattern: /^\/training\/(attempts|analytics)$/, roles: ['1372482495035211908'] },
  { pattern: /^\/training(\/handbook)?$/, roles: ['1372476380096237609'] },
  { pattern: /^\/admins$/, roles: ['1486826723210428496'], allowAdmin: true },
  { pattern: /^\/admin(\/.*)?$/, adminOnly: true },
  { pattern: /^\/audit-logs$/, adminOnly: true },
];

const MIN_INTERVAL_MS = 5000;
const MAX_INTERVAL_MS = 120000;
const ERROR_BACKOFF_MULTIPLIER = 2;

function getMissingAccess(path, roles = [], isAdminUser = false) {
  const rule = ROUTE_RULES.find(item => item.pattern.test(path));
  if (!rule) return null;
  if (isAdminUser) return null;
  if (rule.adminOnly) return 'ADMIN';
  const allowed = rule.roles || [];
  return allowed.some(roleId => roles.includes(roleId)) ? null : allowed[0];
}

function computeNextInterval(consecutiveErrors, currentInterval, rateLimit) {
  if (consecutiveErrors > 0) {
    return Math.min(currentInterval * ERROR_BACKOFF_MULTIPLIER, MAX_INTERVAL_MS);
  }

  if (!rateLimit) {
    return MIN_INTERVAL_MS;
  }

  if (rateLimit.retryAfter !== null) {
    return Math.ceil(rateLimit.retryAfter * 1000) + 100;
  }

  const { remaining, resetAfter } = rateLimit;

  if (remaining !== null && resetAfter !== null) {
    if (remaining <= 0) {
      return Math.ceil(resetAfter * 1000) + 1000;
    }
    if (remaining <= 2) {
      return Math.max(Math.ceil((resetAfter * 1000) / remaining), MIN_INTERVAL_MS);
    }
    if (remaining <= 10) {
      return 30000;
    }
  }

  return MIN_INTERVAL_MS;
}

export function UserRefreshProvider({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshedUser, setRefreshedUser] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [accessDenied, setAccessDenied] = useState(null);
  const timeoutRef = useRef(null);
  const prevRolesRef = useRef(null);
  const routeChangeStartRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const currentIntervalRef = useRef(MIN_INTERVAL_MS);

  const navigatingRef = useRef(false);
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(router.pathname);
  pathnameRef.current = router.pathname;
  const fetchRef = useRef(null);

  const scheduleNextFetch = useCallback((delayMs) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    currentIntervalRef.current = delayMs;
    timeoutRef.current = setTimeout(() => { if (fetchRef.current) fetchRef.current(); }, delayMs);
  }, []);

  const fetchRefreshedUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user/refresh');

      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const backoffMs = retryAfter !== null
          ? Math.ceil(parseFloat(retryAfter) * 1000) + 100
          : MIN_INTERVAL_MS;
        consecutiveErrorsRef.current = 0;
        scheduleNextFetch(backoffMs);
        return;
      }

      if (!res.ok) {
        consecutiveErrorsRef.current++;
        const backoff = computeNextInterval(consecutiveErrorsRef.current, currentIntervalRef.current, null);
        scheduleNextFetch(backoff);
        return;
      }

      consecutiveErrorsRef.current = 0;
      const data = await res.json();
      if (data.error) {
        const backoff = computeNextInterval(0, currentIntervalRef.current, data._ratelimit || null);
        scheduleNextFetch(backoff);
        return;
      }

      setRefreshedUser(prev => {
        if (JSON.stringify(prev?.roles) !== JSON.stringify(data.roles)) {
          setIsStale(true);
          setTimeout(() => setIsStale(false), 3000);
        }
        return data;
      });

      if (data.roles && !navigatingRef.current) {
        const missingRole = getMissingAccess(pathnameRef.current, data.roles, data.isAdmin);

        if (missingRole) {
          setAccessDenied({ roleId: missingRole });
        } else {
          setAccessDenied(null);
        }
      }
      prevRolesRef.current = data.roles;

      const nextInterval = computeNextInterval(0, currentIntervalRef.current, data._ratelimit || null);
      scheduleNextFetch(nextInterval);
    } catch {
      consecutiveErrorsRef.current++;
      const backoff = Math.min(currentIntervalRef.current * ERROR_BACKOFF_MULTIPLIER, MAX_INTERVAL_MS);
      scheduleNextFetch(backoff);
    }
  }, [scheduleNextFetch]);

  useEffect(() => {
    fetchRef.current = fetchRefreshedUser;
  }, [fetchRefreshedUser]);

  useEffect(() => {
    if (status === 'authenticated') {
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = MIN_INTERVAL_MS;
      fetchRefreshedUser();
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setRefreshedUser(null);
      prevRolesRef.current = null;
      setAccessDenied(null);
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = MIN_INTERVAL_MS;
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [status, fetchRefreshedUser]);

  useEffect(() => {
    const handleStart = () => {
      routeChangeStartRef.current = true;
      setAccessDenied(null);
    };
    const handleComplete = () => {
      routeChangeStartRef.current = false;
      if (status === 'authenticated') {
        fetchRefreshedUser();
      }
    };
    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
    };
  }, [status, fetchRefreshedUser]);

  const value = {
    refreshedUser,
    isStale,
    hasRefreshed: !!refreshedUser,
    accessDenied,
    refreshNow: fetchRefreshedUser,
    clearAccessDenied: () => setAccessDenied(null),
    roleMap: ROLE_MAP,
  };

  return (
    <UserRefreshContext.Provider value={value}>
      {children}
    </UserRefreshContext.Provider>
  );
}

export function useRefreshedUser() {
  const ctx = useContext(UserRefreshContext);
  const { data: session } = useSession();

  if (!ctx) {
    return { refreshedUser: null, isStale: false, hasRefreshed: false, accessDenied: null, clearAccessDenied: () => {}, roleMap: ROLE_MAP };
  }

  const mergedUser = useMemo(() => {
    if (!ctx.refreshedUser) return session?.user;
    return {
      ...session?.user,
      roles: ctx.refreshedUser.roles || session?.user?.roles || [],
      displayRole: ctx.refreshedUser.displayRole || session?.user?.displayRole || 'User',
      name: ctx.refreshedUser.name || session?.user?.name,
      image: ctx.refreshedUser.avatar || session?.user?.image,
      isAdmin: ctx.refreshedUser.isAdmin || false,
      discordRoles: ctx.refreshedUser.discordRoles || [],
    };
  }, [ctx.refreshedUser, session]);

  const mergedSession = useMemo(() => {
    if (!session) return null;
    return { ...session, user: mergedUser };
  }, [session, mergedUser]);

  return {
    refreshedUser: mergedUser,
    session: mergedSession,
    isStale: ctx.isStale,
    hasRefreshed: ctx.hasRefreshed,
    accessDenied: ctx.accessDenied,
    refreshNow: ctx.refreshNow,
    clearAccessDenied: ctx.clearAccessDenied,
    roleMap: ctx.roleMap,
  };
}
