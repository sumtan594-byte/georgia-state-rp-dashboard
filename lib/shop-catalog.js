export const SHOP_SUPPORT_CHANNEL_URL = 'https://discord.com/channels/1366688107788894280/1372499646223482930';

export const SHOP_ROLES = {
  premium: ['1372482493701165118', '1393116208026488963'],
  donorPlus: ['1391175328545636444', '1393116208026488963'],
};

export const DONATION_PERKS = [
  "Access to exclusive chats and giveaways",
  "Respect from the community",
  "Special donator color in Discord",
  "Supporting server hosting and updates"
];

export const PREMIUM_PERKS = [
  "Permissions to send files in all channels",
  "Access to exclusive chats and giveaways",
  "Premium role in Discord server",
  "Early access to new features for premium",
  "Priority support tickets"
];

export const PRODUCTS = {
  premium: [
    {
      id: 'premium',
      name: "GSRP | Premium",
      price: 500,
      gamePassId: '1288437153',
      link: "https://www.roblox.com/game-pass/1288437153/GSRP-Premium",
      iconName: 'crown',
      featured: true,
      perks: PREMIUM_PERKS,
      rewardType: 'roles',
      roleIds: SHOP_ROLES.premium,
    },
  ],
  advertisements: [
    {
      id: 'here-ping',
      name: "@Here Ping",
      price: 100,
      gamePassId: '1288508785',
      link: "https://www.roblox.com/game-pass/1288508785/Here-Ping",
      iconName: 'zap',
      perks: ["Ping all online users in a designated channel"],
      rewardType: 'support',
    },
    {
      id: 'everyone-ping',
      name: "@everyone Ping",
      price: 500,
      gamePassId: '1283601162',
      link: "https://www.roblox.com/game-pass/1283601162/everyone-Ping",
      iconName: 'zap',
      featured: true,
      perks: ["Ping every member in the server with an announcement"],
      rewardType: 'support',
    },
  ],
  donations: [
    { id: 'donate-100', name: "GSRP Donate 100", price: 100, gamePassId: '1283365474', link: "https://www.roblox.com/game-pass/1283365474/GSRP-Donate-100", iconName: 'heart' },
    { id: 'donate-150', name: "Donate GSRP 150", price: 150, gamePassId: '1241343193', link: "https://www.roblox.com/game-pass/1241343193/Donate-GSRP-150", iconName: 'heart' },
    { id: 'donate-200', name: "GSRP Donate 200", price: 200, gamePassId: '1285163386', link: "https://www.roblox.com/game-pass/1285163386/GSRP-Donate-200", iconName: 'heart' },
    { id: 'donate-300', name: "GSRP Donate 300", price: 300, gamePassId: '1283401426', link: "https://www.roblox.com/game-pass/1283401426/GSRP-Donate-300", iconName: 'heart' },
    { id: 'donate-400', name: "GSRP Donate 400", price: 400, gamePassId: '1283831453', link: "https://www.roblox.com/game-pass/1283831453/GSRP-Donate-400", iconName: 'heart' },
    { id: 'donate-500', name: "Donate GSRP 500", price: 500, gamePassId: '1285641030', link: "https://www.roblox.com/game-pass/1285641030/Donate-GSRP-500", iconName: 'heart' },
    {
      id: 'donate-650',
      name: "GSRP Donate 650",
      price: 650,
      gamePassId: '1306588775',
      link: "https://www.roblox.com/game-pass/1306588775/GSRP-Donate-650",
      iconName: 'heart',
      rewardType: 'roles',
      roleIds: SHOP_ROLES.donorPlus,
    },
    {
      id: 'donate-700',
      name: "GSRP Donate 700",
      price: 700,
      gamePassId: '1304704857',
      link: "https://www.roblox.com/game-pass/1304704857/GSRP-Donate-700",
      iconName: 'heart',
      rewardType: 'roles',
      roleIds: SHOP_ROLES.donorPlus,
    },
    {
      id: 'donate-1000',
      name: "GSRP Donate 1000",
      price: 1000,
      gamePassId: '1305958782',
      link: "https://www.roblox.com/game-pass/1305958782/GSRP-Donate-1000",
      iconName: 'heart',
      rewardType: 'roles',
      roleIds: SHOP_ROLES.donorPlus,
    },
  ]
};

export const PRODUCT_LIST = Object.values(PRODUCTS).flat();

export function findShopProduct(productId) {
  return PRODUCT_LIST.find(product => product.id === productId) || null;
}
