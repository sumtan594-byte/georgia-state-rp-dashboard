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

export function UserRefreshProvider({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshedUser, setRefreshedUser] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [accessDenied, setAccessDenied] = useState(null);
  const intervalRef = useRef(null);
  const prevRolesRef = useRef(null);
  const routeChangeStartRef = useRef(false);

  const navigatingRef = useRef(false);
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(router.pathname);
  pathnameRef.current = router.pathname;

  const fetchRefreshedUser = useCallback(async () => {
    try {
      const res = await fetch('/api/user/refresh');
      if (res.ok) {
        const data = await res.json();
        if (data.error) return;

        setRefreshedUser(prev => {
          if (JSON.stringify(prev?.roles) !== JSON.stringify(data.roles)) {
            setIsStale(true);
            setTimeout(() => setIsStale(false), 3000);
          }
          return data;
        });

        if (data.roles && !navigatingRef.current) {
          const curr = data.roles;
          const isAdminUser = data.isAdmin;
          const path = pathnameRef.current;

          let missingRole = null;
          if (path === '/panel' && !curr.includes('1372476381115453550') && !isAdminUser) {
            missingRole = '1372476381115453550';
          } else if (path.startsWith('/applications') && path !== '/apply' && !curr.includes('1372491512709124106') && !isAdminUser) {
            missingRole = '1372491512709124106';
          } else if (path === '/staff-handbook' && !curr.includes('1372476381115453550') && !curr.includes('1372476380096237609') && !isAdminUser) {
            missingRole = curr.includes('1372476381115453550') ? null : '1372476380096237609';
          } else if ((path === '/training' || path === '/training/handbook') && !curr.includes('1372476380096237609') && !isAdminUser) {
            missingRole = '1372476380096237609';
          } else if ((path === '/training/attempts' || path === '/training/analytics') && !curr.includes('1372482495035211908') && !isAdminUser) {
            missingRole = '1372482495035211908';
          } else if (path === '/admins' && !isAdminUser && !curr.includes('1486826723210428496')) {
            missingRole = '1486826723210428496';
          } else if (path === '/audit-logs' && !isAdminUser) {
            missingRole = 'ADMIN';
          } else if (path === '/admin/user-validations' && !isAdminUser) {
            missingRole = 'ADMIN';
          }

          if (missingRole) {
            setAccessDenied({ roleId: missingRole });
          } else {
            setAccessDenied(null);
          }
        }
        prevRolesRef.current = data.roles;
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchRefreshedUser();
      intervalRef.current = setInterval(fetchRefreshedUser, 30000);
    } else {
      setRefreshedUser(null);
      prevRolesRef.current = null;
      setAccessDenied(null);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
    clearAccessDenied: ctx.clearAccessDenied,
    roleMap: ctx.roleMap,
  };
}
