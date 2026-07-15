export const SITE_URL = 'https://join-gsrp.com';
export const EMBED_IMAGE = 'https://i.imgur.com/4gUXTJB.png';
export const EMBED_THEME_COLOR = '#f97316';

function rolesText(roleIds = []) {
  if (!roleIds.length) return '';
  return ` Locked to ${roleIds.map(roleId => `<@&${roleId}>`).join(', ')}.`;
}

export const ROUTE_EMBEDS = [
  {
    paths: ['/'],
    title: 'Georgia State Roleplay, #1 ERLC Roleplay Server',
    description: 'Join Georgia State Roleplay (GSRP), one of the largest & most professional Emergency Response: Liberty County (ER:LC) roleplay communities on Roblox. 9,000+ members, trained staff, realistic departments.',
  },
  {
    paths: ['/dashboard'],
    title: 'GSRP Dashboard',
    description: 'Access the Georgia State Roleplay operations dashboard.',
  },
  {
    paths: ['/shop'],
    title: 'GSRP Store',
    description: 'Browse and claim Georgia State Roleplay store perks.',
  },
  {
    paths: ['/transcripts'],
    title: 'Ticket Transcripts',
    description: `Search and review saved GSRP ticket transcripts.${rolesText(['1372482492132626432'])}`,
  },
  {
    paths: ['/training'],
    title: 'Staff Orientation Quiz',
    description: `Complete the Staff Services Division training quiz.${rolesText(['1372476380096237609'])}`,
  },
  {
    paths: ['/training/ridealong'],
    title: 'Ridealong Training',
    description: `Complete and track ridealong training progress.${rolesText(['1372476380096237609'])}`,
  },
  {
    paths: ['/training/handbook'],
    title: 'Training Handbook',
    description: `Review Staff orientation training material before attempting the quiz.${rolesText(['1372476380096237609'])}`,
  },
  {
    paths: ['/staff-handbook'],
    title: 'Staff Handbook',
    description: `Read GSRP staff policies, procedures, and expectations.${rolesText(['1372476381115453550', '1372476380096237609'])}`,
  },
  {
    paths: ['/panel'],
    title: 'Live Panel',
    description: `Monitor live ER:LC server activity and operational tools.${rolesText(['1372476381115453550'])}`,
  },
  {
    paths: ['/panel/stats'],
    title: 'Live Panel Statistics',
    description: `Review live panel statistics and server activity trends.${rolesText(['1372476381115453550'])}`,
  },
  {
    paths: ['/training/attempts'],
    title: 'Quiz Attempts',
    description: `Review submitted Staff orientation quiz attempts and training outcomes.${rolesText(['1372482495035211908'])}`,
  },
  {
    paths: ['/training/analytics'],
    title: 'Training Analytics',
    description: `Analyze Staff orientation quiz performance and training progress.${rolesText(['1372482495035211908'])}`,
  },
  {
    paths: ['/training/ridealong/attempts'],
    title: 'Ridealong Attempts',
    description: `Review submitted ridealong training attempts.${rolesText(['1372482495035211908'])}`,
  },
  {
    paths: ['/training/ridealong/analytics'],
    title: 'Ridealong Analytics',
    description: `Analyze ridealong completion and training performance.${rolesText(['1372482495035211908'])}`,
  },
  {
    paths: ['/apply'],
    title: 'Applications',
    description: 'Start a Georgia State Roleplay application.',
  },
  {
    paths: ['/applications'],
    title: 'Application Review Hub',
    description: `Review and process submitted GSRP applications.${rolesText(['1372491512709124106'])}`,
  },
  {
    paths: ['/applications/manage'],
    title: 'Manage Applications',
    description: `Configure and manage GSRP application workflows.${rolesText(['1372491512709124106'])}`,
  },
  {
    paths: ['/verify'],
    title: 'Roblox Verification',
    description: 'Link your Roblox account to your GSRP Discord profile.',
  },
  {
    paths: ['/privacy-policy'],
    title: 'Privacy Policy',
    description: 'Review how Georgia State Roleplay handles website data.',
  },
  {
    paths: ['/terms-of-service'],
    title: 'Terms of Service',
    description: 'Review the terms for using Georgia State Roleplay services.',
  },
];

function normalizePath(pathname = '/') {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/$/, '') || '/';
}

export function getRouteEmbed(pathname) {
  const normalizedPath = normalizePath(pathname);
  const matches = ROUTE_EMBEDS
    .filter(embed => embed.paths.some(path => normalizedPath === path || normalizedPath.startsWith(`${path}/`)))
    .sort((a, b) => Math.max(...b.paths.map(path => path.length)) - Math.max(...a.paths.map(path => path.length)));

  return matches[0] || null;
}

export function buildPageUrl(asPath = '/') {
  const path = String(asPath || '/').split('#')[0];
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildTranscriptEmbed(meta) {
  const owner = meta?.openerTag || meta?.ownerTag || meta?.ownerId || 'GSRP';
  return {
    title: `${owner}'s ticket transcript.`,
    description: 'Review this Georgia State Roleplay ticket transcript.',
  };
}
