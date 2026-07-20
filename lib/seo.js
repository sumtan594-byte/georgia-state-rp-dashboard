export const SITE_URL = 'https://join-gsrp.com';
export const SITE_NAME = 'Georgia State Roleplay';
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/media/gsrp-logo.png`;

const INDEXABLE_PAGES = {
  '/': {
    title: 'Georgia State Roleplay | ER:LC Roleplay Server',
    description: 'Join Georgia State Roleplay, a professional Emergency Response: Liberty County roleplay community on Roblox with daily sessions, trained staff, realistic departments, and 9,000+ members.',
  },
  '/about': {
    title: 'About Georgia State Roleplay | ER:LC Community',
    description: 'Learn how Georgia State Roleplay creates organised, realistic, and welcoming ER:LC sessions for Roblox players across multiple departments.',
  },
  '/how-to-join': {
    title: 'How to Join Georgia State Roleplay | ER:LC Server',
    description: 'Follow the simple steps to join Georgia State Roleplay on Discord and Roblox, verify your account, and take part in an ER:LC session.',
  },
  '/server-rules': {
    title: 'Georgia State Roleplay Server Rules | ER:LC',
    description: 'Read the core Georgia State Roleplay rules for respectful conduct, realistic roleplay, driving, scenes, and staff directions.',
  },
  '/faq': {
    title: 'Georgia State Roleplay FAQ | ER:LC Questions',
    description: 'Find answers about joining GSRP, ER:LC sessions, departments, applications, Roblox verification, and community requirements.',
  },
  '/events': {
    title: 'Georgia State Roleplay Events | ER:LC Sessions',
    description: 'Discover the patrols, races, community meets, tactical operations, and special ER:LC events hosted by Georgia State Roleplay.',
  },
  '/trailer': {
    title: 'Georgia State Roleplay Trailer | ER:LC Community',
    description: 'Watch the official Georgia State Roleplay trailer and see our ER:LC community, departments, patrols, events, and roleplay experience.',
    image: `${SITE_URL}/media/landing-showcases/img-1.png`,
    type: 'video.other',
  },
  '/shop': {
    title: 'GSRP Store | Georgia State Roleplay Perks',
    description: 'Browse Georgia State Roleplay premium perks, Roblox game passes, paid advertisements, and community support options.',
  },
  '/apply': {
    title: 'Apply to Georgia State Roleplay | Staff and Departments',
    description: 'Explore open Georgia State Roleplay applications, learn what the process involves, and apply for eligible staff or department opportunities.',
  },
  '/privacy-policy': {
    title: 'Privacy Policy | Georgia State Roleplay',
    description: 'Learn how Georgia State Roleplay collects, uses, stores, and protects information across its website and connected services.',
  },
  '/terms-of-service': {
    title: 'Terms of Service | Georgia State Roleplay',
    description: 'Read the terms that govern use of the Georgia State Roleplay website, dashboard, applications, store, training, and verification services.',
  },
};

export const DEPARTMENT_SEO = {
  police: ['Police Department', 'Patrol Atlanta City, respond to calls, conduct traffic stops, and build a law-enforcement career in the GSRP ER:LC Police Department.'],
  sheriff: ["Sheriff's Office", "Serve county areas through patrols, pursuits, investigations, and coordinated scenes in the GSRP ER:LC Sheriff's Office."],
  'fire-ems': ['Fire & EMS', 'Respond to fires, crashes, rescues, and medical emergencies with the Georgia State Roleplay Fire & EMS department in ER:LC.'],
  'homeland-security': ['Homeland Security', 'Take part in specialised security operations and advanced coordinated roleplay with GSRP Homeland Security in ER:LC.'],
  communications: ['Communications', 'Coordinate ER:LC units, calls, and incidents as a dispatcher in the Georgia State Roleplay Communications department.'],
  civilian: ['Civilian Operations', 'Create businesses, stories, events, and realistic everyday scenes through GSRP Civilian Operations in ER:LC.'],
};

export const INDEXABLE_PATHS = [
  ...Object.keys(INDEXABLE_PAGES),
  ...Object.keys(DEPARTMENT_SEO).map((slug) => `/departments/${slug}`),
];

const PUBLIC_UTILITY_PATHS = new Set(['/login', '/verify', '/ban-appeals']);

export function normalizePath(value = '/') {
  const withoutQuery = String(value || '/').split(/[?#]/)[0] || '/';
  return withoutQuery !== '/' ? withoutQuery.replace(/\/+$/, '') : '/';
}

export function isIndexablePath(value) {
  return INDEXABLE_PATHS.includes(normalizePath(value));
}

export function isPublicRoute(value) {
  const path = normalizePath(value);
  return isIndexablePath(path) || PUBLIC_UTILITY_PATHS.has(path);
}

export function getSeoForPath(value) {
  const path = normalizePath(value);
  if (INDEXABLE_PAGES[path]) {
    return { ...INDEXABLE_PAGES[path], path, indexable: true };
  }

  const departmentMatch = path.match(/^\/departments\/([^/]+)$/);
  const department = departmentMatch ? DEPARTMENT_SEO[departmentMatch[1]] : null;
  if (department) {
    return {
      path,
      indexable: true,
      title: `${department[0]} | Georgia State Roleplay ER:LC`,
      description: department[1],
    };
  }

  return {
    path,
    indexable: false,
    title: 'GSRP Dashboard | Georgia State Roleplay',
    description: 'Georgia State Roleplay member service.',
  };
}

export function absoluteUrl(path = '/') {
  const normalized = normalizePath(path);
  return normalized === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalized}`;
}
