export const DISCORD_INVITE = 'https://discord.gg/gsrp7';
export const ROBLOX_COMMUNITY = 'https://www.roblox.com/communities/5438941/Georgia-State-Roleplay#!/about';

export const PUBLIC_PAGES = {
  about: {
    eyebrow: 'About GSRP',
    title: 'Organised roleplay, built around community',
    intro: 'Georgia State Roleplay is an Emergency Response: Liberty County community on Roblox. We bring players together for structured sessions set in Atlanta City, with trained staff, active departments, and room for every kind of roleplayer.',
    image: '/media/landing-showcases/img-3.jpg',
    sections: [
      { title: 'A place for realistic stories', body: ['Our sessions are designed to make every traffic stop, emergency call, investigation, business, and community event part of a larger shared story. Clear rules and active moderation help scenes remain fair and enjoyable.'] },
      { title: 'Departments with purpose', body: ['Players can explore law enforcement, Fire & EMS, Communications, Homeland Security, and Civilian Operations. Each path contributes something different to the server and creates opportunities for coordinated roleplay.'] },
      { title: 'A community that keeps moving', body: ['Daily sessions, training, applications, special events, and progression give members reasons to return. New players can start as civilians and learn at their own pace before pursuing additional roles.'] },
    ],
    related: ['/how-to-join', '/departments/police', '/events'],
  },
  'how-to-join': {
    eyebrow: 'Getting started',
    title: 'How to join Georgia State Roleplay',
    intro: 'You can join GSRP in a few simple steps. Discord is the community hub, while Roblox is where ER:LC sessions take place.',
    image: '/media/landing-showcases/img-1.png',
    sections: [
      { title: '1. Join the GSRP Discord', body: ['Open the official Discord invite and review the welcome information. Discord announcements tell members when sessions, events, applications, and training opportunities are available.'] },
      { title: '2. Read the rules', body: ['Review the server rules before joining a session. Understanding expectations around realistic roleplay, conduct, driving, and staff directions helps you start confidently.'] },
      { title: '3. Connect your accounts', body: ['Sign in to the GSRP dashboard with Discord and use Roblox Verification when requested. Verification links the correct Roblox identity to your Discord profile and unlocks eligible services.'] },
      { title: '4. Join a session', body: ['Follow the session announcement, launch Emergency Response: Liberty County on Roblox, and use the server information provided in Discord. New members can begin with civilian roleplay and learn from active scenes.'] },
    ],
    related: ['/server-rules', '/faq', '/apply'],
  },
  'server-rules': {
    eyebrow: 'Community standards',
    title: 'Core Georgia State Roleplay rules',
    intro: 'These public guidelines explain the foundations of good roleplay at GSRP. The complete and most current rules are published in the official Discord server and take precedence.',
    image: '/media/scroll-showcases/maintain-safety.png',
    sections: [
      { title: 'Respect people and the scene', body: ['Treat members and staff respectfully. Harassment, discrimination, targeted disruption, and deliberately ruining another player’s scene are not acceptable.'] },
      { title: 'Roleplay realistically', body: ['Make decisions your character could reasonably make, value their safety, and give other players time to respond. Avoid unrealistic actions that remove meaningful choices from a scene.'] },
      { title: 'Drive and use vehicles responsibly', body: ['Match your driving to the situation. Reckless driving, unnecessary collisions, random pursuits, or using vehicles to disrupt scenes can damage the experience for everyone.'] },
      { title: 'Follow staff directions', body: ['Staff may pause, reset, or resolve a scene to keep the session fair. Cooperate in the moment and use the proper support or appeal process if you want a decision reviewed.'] },
      { title: 'Keep information in character', body: ['Do not use private, out-of-character, stream, or map information your character could not know. Let information develop naturally through roleplay.'] },
    ],
    related: ['/how-to-join', '/faq', '/about'],
  },
  faq: {
    eyebrow: 'Frequently asked questions',
    title: 'Questions about joining and playing',
    intro: 'Find quick answers about GSRP sessions, departments, applications, verification, and getting started in Emergency Response: Liberty County.',
    image: '/media/scroll-showcases/team-up.png',
    sections: [
      { title: 'Is Georgia State Roleplay free to join?', body: ['Yes. Joining the community and taking part in standard sessions is free. Optional Roblox game passes and support products are listed separately in the GSRP Store.'] },
      { title: 'Do I need experience with ER:LC?', body: ['No. New roleplayers can begin as civilians, read the rules, observe how sessions work, and ask appropriate questions in the community.'] },
      { title: 'When are sessions hosted?', body: ['Sessions and special events are announced in the official Discord server. Timing varies so members in different regions can participate.'] },
      { title: 'How do I join a department or the staff team?', body: ['Check the Applications page for opportunities available to your account. Some roles require prior experience, training, activity, or an existing Discord role.'] },
      { title: 'Why is Roblox verification required?', body: ['Verification connects your Discord member profile with the correct Roblox account. This supports access control, purchase verification, and community safety.'] },
      { title: 'Where can I get help?', body: ['Use the official support channels in the GSRP Discord. Staff can help with access, verification, applications, purchases, and in-session concerns.'] },
    ],
    related: ['/how-to-join', '/apply', '/shop'],
  },
  events: {
    eyebrow: 'Sessions and events',
    title: 'Something different in every session',
    intro: 'GSRP hosts organised ER:LC sessions and special community events that give departments and civilians fresh stories to explore. Current event times are announced in Discord.',
    image: '/media/scroll-showcases/participate-events-flex.png',
    sections: [
      { title: 'Patrol and emergency sessions', body: ['Regular sessions create traffic stops, investigations, fires, medical calls, pursuits, and civilian stories across Atlanta City. Departments coordinate while civilians shape the world around them.'] },
      { title: 'Vehicle meets and races', body: ['Community meets give members a chance to showcase vehicles and socialise. Organised races and driving events use clear routes and staff oversight.'] },
      { title: 'Large-scale operations', body: ['Tactical events bring multiple agencies together for planned incidents, major investigations, and coordinated responses that are larger than a normal patrol scene.'] },
      { title: 'Relaxed community events', body: ['Not every event is a crisis. Camps, convoys, celebrations, and casual meetups help members get to know one another outside high-pressure scenes.'] },
    ],
    related: ['/trailer', '/departments/civilian', '/how-to-join'],
  },
};

export const DEPARTMENTS = {
  police: {
    name: 'Police Department',
    eyebrow: 'Law enforcement',
    image: '/media/scroll-showcases/maintain-safety.png',
    intro: 'The Police Department handles city patrols, traffic enforcement, emergency calls, investigations, and public safety throughout Atlanta City.',
    responsibilities: ['Respond to calls and support active scenes', 'Conduct realistic traffic stops and patrols', 'Coordinate pursuits and investigations', 'Work alongside Sheriff, Fire & EMS, and Communications'],
  },
  sheriff: {
    name: "Sheriff's Office",
    eyebrow: 'County law enforcement',
    image: '/media/landing-showcases/img-6.png',
    intro: "The Sheriff's Office provides county-wide patrol coverage and works with other agencies during pursuits, investigations, and high-priority incidents.",
    responsibilities: ['Patrol county roads and communities', 'Support major incidents across jurisdictions', 'Take part in pursuits and planned operations', 'Build clear, realistic law-enforcement scenes'],
  },
  'fire-ems': {
    name: 'Fire & EMS',
    eyebrow: 'First response',
    image: '/media/scroll-showcases/respond-to-emergencies.png',
    intro: 'Fire & EMS members respond to fires, collisions, rescues, and medical emergencies while coordinating safe, detailed scenes with other departments.',
    responsibilities: ['Provide fire suppression and rescue roleplay', 'Treat patients and manage medical scenes', 'Secure collisions and hazardous incidents', 'Coordinate with law enforcement and dispatch'],
  },
  'homeland-security': {
    name: 'Homeland Security',
    eyebrow: 'Specialised operations',
    image: '/media/scroll-showcases/tac-ops.png',
    intro: 'Homeland Security supports advanced security scenarios and organised operations that require planning, teamwork, and experienced roleplay.',
    responsibilities: ['Take part in planned tactical operations', 'Support major threats and high-risk incidents', 'Coordinate with law-enforcement leadership', 'Maintain disciplined and realistic scenarios'],
  },
  communications: {
    name: 'Communications',
    eyebrow: 'Dispatch and coordination',
    image: '/media/landing-showcases/img-10.png',
    intro: 'Communications keeps a session organised by receiving calls, assigning units, sharing updates, and helping departments coordinate their response.',
    responsibilities: ['Dispatch calls to the right department', 'Track unit status and active incidents', 'Relay clear, concise information', 'Support smooth multi-agency scenes'],
  },
  civilian: {
    name: 'Civilian Operations',
    eyebrow: 'Create the story',
    image: '/media/scroll-showcases/camp-n-chill.png',
    intro: 'Civilian Operations drives the everyday life of Atlanta City through businesses, social scenes, legal stories, criminal scenarios, and community events.',
    responsibilities: ['Create original characters and storylines', 'Run businesses and community scenes', 'Give emergency services meaningful calls', 'Build fair scenarios with room for everyone to respond'],
  },
};

export const LINK_LABELS = {
  '/': 'Home', '/about': 'About GSRP', '/how-to-join': 'How to Join', '/server-rules': 'Server Rules',
  '/faq': 'FAQ', '/events': 'Events', '/trailer': 'Official Trailer', '/shop': 'GSRP Store', '/apply': 'Applications',
  '/departments/police': 'Police Department', '/departments/sheriff': "Sheriff's Office",
  '/departments/fire-ems': 'Fire & EMS', '/departments/homeland-security': 'Homeland Security',
  '/departments/communications': 'Communications', '/departments/civilian': 'Civilian Operations',
};
