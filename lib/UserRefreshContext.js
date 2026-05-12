import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

const UserRefreshContext = createContext(null);

export function UserRefreshProvider({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshedUser, setRefreshedUser] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const intervalRef = useRef(null);
  const prevRolesRef = useRef(null);

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

        if (prevRolesRef.current && data.roles && !navigatingRef.current) {
          const prev = prevRolesRef.current;
          const curr = data.roles;
          const lostSome = prev.some(r => !curr.includes(r));
          if (lostSome) {
            const isAdminUser = data.isAdmin;
            const panelRoleId = '1372476381115453550';
            const appStaffRoleId = '1372491512709124106';
            const traineeRoleId = '1372476380096237609';

            const path = pathnameRef.current;
            let target = null;
            if (path === '/panel' && !curr.includes(panelRoleId) && !isAdminUser) {
              target = '/';
            } else if (path.startsWith('/applications') && path !== '/apply' && !curr.includes(appStaffRoleId) && !isAdminUser) {
              target = '/';
            } else if (path === '/staff-handbook' && !curr.includes(panelRoleId) && !curr.includes(traineeRoleId) && !isAdminUser) {
              target = '/';
            }
            if (target) {
              navigatingRef.current = true;
              routerRef.current.push(target);
              setTimeout(() => { navigatingRef.current = false; }, 1000);
            }
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
      intervalRef.current = setInterval(fetchRefreshedUser, 5000);
    } else {
      setRefreshedUser(null);
      prevRolesRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, fetchRefreshedUser]);

  const value = {
    refreshedUser,
    isStale,
    hasRefreshed: !!refreshedUser,
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
    return { refreshedUser: null, isStale: false };
  }

  const mergedUser = ctx.refreshedUser
    ? {
        ...session?.user,
        roles: ctx.refreshedUser.roles || session?.user?.roles || [],
        displayRole: ctx.refreshedUser.displayRole || session?.user?.displayRole || 'User',
        name: ctx.refreshedUser.name || session?.user?.name,
        image: ctx.refreshedUser.avatar || session?.user?.image,
        isAdmin: ctx.refreshedUser.isAdmin || false,
      }
    : session?.user;

  const mergedSession = session
    ? { ...session, user: mergedUser }
    : null;

  return {
    refreshedUser: mergedUser,
    session: mergedSession,
    isStale: ctx.isStale,
  };
}
