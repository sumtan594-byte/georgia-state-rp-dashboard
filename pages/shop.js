import { useState } from 'react';
import Head from 'next/head';
import { ShoppingCart, Star, Zap, Heart, Shield, Crown, Sparkles, ChevronRight } from 'lucide-react';

const DONATION_PERKS = [
  "Access to exclusive chats and giveaways",
  "Respect from the community",
  "Special donator color in Discord",
  "Supporting server hosting and updates"
];

const PREMIUM_PERKS = [
  "Permissions to send files in all channels",
  "Access to exclusive chats and giveaways",
  "Premium role in Discord server",
  "Early access to new features for premium",
  "Priority support tickets"
];

const PRODUCTS = {
  premium: [
    { name: "GSRP | Premium", price: 250, link: "https://www.roblox.com/game-pass/1288437153/GSRP-Premium", icon: Crown, featured: true, perks: PREMIUM_PERKS },
    { name: "GSRP | VIP", price: 300, link: "#", icon: Star, perks: ["All Premium Perks", "VIP in-game tag", "Custom vehicle plates"] },
    { name: "GSRP Premium +", price: 500, link: "#", icon: Sparkles, featured: true, perks: ["All VIP Perks", "Dedicated voice channel", "Bypass queue priority"] },
  ],
  pings: [
    { name: "@Here Ping", price: 100, link: "https://www.roblox.com/game-pass/1288508785/Here-Ping", icon: Zap, perks: ["Ping all online users in a designated channel"] },
    { name: "@everyone Ping", price: 500, link: "https://www.roblox.com/game-pass/1283601162/everyone-Ping", icon: Zap, featured: true, perks: ["Ping every member in the server with an announcement"] },
    { name: "Ping Exemptions Role!", price: 650, link: "#", icon: Shield, perks: ["Immunity from all @here and @everyone pings", "Special 'Do Not Disturb' role"] },
  ],
  fun: [
    { name: "Kolt ❤️", price: 1500, link: "#", icon: Heart, perks: ["Special Kolt role", "Custom heart icon next to name"], overlay: "Owned" },
    { name: "Morg told me to", price: 5000, link: "#", icon: Star, perks: ["Because Morg said so", "Ultimate flex role", "Global server announcement on purchase"] },
  ],
  donations: [
    { name: "GSRP Donate 100", price: 100, link: "https://www.roblox.com/game-pass/1283365474/GSRP-Donate-100" },
    { name: "Donate GSRP 150", price: 150, link: "https://www.roblox.com/game-pass/1241343193/Donate-GSRP-150" },
    { name: "GSRP Donate 200", price: 200, link: "https://www.roblox.com/game-pass/1285163386/GSRP-Donate-200" },
    { name: "GSRP Donate 300", price: 300, link: "https://www.roblox.com/game-pass/1283401426/GSRP-Donate-300" },
    { name: "GSRP Donate 400", price: 400, link: "https://www.roblox.com/game-pass/1283831453/GSRP-Donate-400" },
    { name: "Donate GSRP 500", price: 500, link: "https://www.roblox.com/game-pass/1285641030/Donate-GSRP-500" },
    { name: "GSRP Donate 650", price: 650, link: "https://www.roblox.com/game-pass/1306588775/GSRP-Donate-650" },
    { name: "GSRP Donate 700", price: 700, link: "https://www.roblox.com/game-pass/1304704857/GSRP-Donate-700" },
    { name: "GSRP Donate 1000", price: 1000, link: "https://www.roblox.com/game-pass/1305958782/GSRP-Donate-1000" },
  ]
};

export default function Shop() {
  const [activeTab, setActiveTab] = useState('premium');

  return (
    <div className="max-w-7xl mx-auto animate-fade-in-up">
      <Head>
        <title>Shop | GSRP Dashboard</title>
      </Head>

      <div className="mb-8 p-8 rounded-2xl bg-card-gradient border border-gsrp-dark-border/50 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/10 to-gsrp-teal/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gsrp-orange/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gsrp-teal/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:justify-between gap-6">
          <div>
            <h1 className="text-white font-black text-3xl md:text-5xl mb-4 tracking-tight flex items-center gap-4">
              <ShoppingCart className="w-10 h-10 text-gsrp-orange" />
              GSRP Store
            </h1>
            <p className="text-gsrp-teal-light/60 text-lg max-w-2xl font-medium">
              Support the Georgia State Roleplay community and unlock exclusive perks, roles, and in-game advantages.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-gsrp-orange to-gsrp-teal p-0.5 animate-float">
              <div className="w-full h-full bg-gsrp-dark-card rounded-2xl flex items-center justify-center">
                <Crown className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {['premium', 'pings', 'fun', 'donations'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 capitalize flex-shrink-0 ${
              activeTab === tab
                ? 'bg-gsrp-orange text-white shadow-lg shadow-gsrp-orange/20 scale-105'
                : 'bg-gsrp-dark-card/50 text-gsrp-teal-light/40 hover:bg-gsrp-dark-surface hover:text-white border border-gsrp-dark-border/50'
            }`}
          >
            {tab === 'fun' ? 'Special/Fun' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PRODUCTS[activeTab].map((product, idx) => (
          <div 
            key={idx}
            className={`relative rounded-2xl border transition-all duration-300 flex flex-col h-full bg-gsrp-dark-card/60 backdrop-blur-md group hover:-translate-y-2
              ${product.featured 
                ? 'border-gsrp-orange/50 shadow-lg shadow-gsrp-orange/10 hover:shadow-gsrp-orange/20 hover:border-gsrp-orange' 
                : 'border-gsrp-dark-border/50 hover:border-gsrp-teal/50 hover:shadow-lg hover:shadow-gsrp-teal/10'
              }
            `}
          >
            {product.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white text-[10px] font-black uppercase tracking-widest py-1 px-4 rounded-full shadow-lg z-10 whitespace-nowrap">
                Most Popular
              </div>
            )}
            
            {product.overlay && (
              <div className="absolute inset-0 bg-gsrp-dark-card/80 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-2xl border border-gsrp-dark-border/50">
                <div className="bg-gsrp-dark-surface px-6 py-3 rounded-xl font-black text-xl text-gsrp-teal-light tracking-widest uppercase border border-gsrp-teal/30 shadow-[0_0_20px_rgba(20,184,166,0.2)] transform -rotate-12">
                  {product.overlay}
                </div>
              </div>
            )}

            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${product.featured ? 'bg-gsrp-orange/10 text-gsrp-orange' : 'bg-gsrp-teal/10 text-gsrp-teal-light'}`}>
                  {product.icon ? <product.icon className="w-6 h-6" /> : <Heart className="w-6 h-6" />}
                </div>
                <div className="text-right">
                  <span className="block text-2xl font-black text-white">R$ {product.price}</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-gsrp-orange transition-colors">{product.name}</h3>
              
              <div className="mt-4 flex-1">
                {(product.perks || DONATION_PERKS).map((perk, i) => (
                  <div key={i} className="flex items-start gap-3 mb-3 text-sm text-gsrp-teal-light/60">
                    <ChevronRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${product.featured ? 'text-gsrp-orange' : 'text-gsrp-teal'}`} />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 pt-0 mt-auto">
              {product.link && product.link !== "#" ? (
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300
                    ${product.featured
                      ? 'bg-gradient-to-r from-gsrp-orange to-gsrp-warm text-white hover:shadow-lg hover:shadow-gsrp-orange/20 hover:scale-[1.02]'
                      : 'bg-gsrp-teal-light/10 text-gsrp-teal-light hover:bg-gsrp-teal-light hover:text-white hover:shadow-lg hover:shadow-gsrp-teal/20 hover:scale-[1.02]'
                    }
                  `}
                >
                  <ShoppingCart className="w-5 h-5" />
                  Purchase Integration
                </a>
              ) : (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-gsrp-dark-surface text-gsrp-teal-light/30 cursor-not-allowed border border-gsrp-dark-border/50"
                >
                  Unavailable
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
