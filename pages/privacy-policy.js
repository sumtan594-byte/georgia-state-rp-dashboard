import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full animate-fade-in-up">
          <Link href="/" className="inline-flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange-light text-[10px] font-bold uppercase tracking-widest transition-colors mb-8 cursor-pointer">
            <ArrowLeft size={12} /> Back to site
          </Link>
          <div className="card-glass rounded-2xl p-8 shadow-2xl">
            <h1 className="text-white font-bold text-2xl mb-6">Privacy Policy</h1>
            <div className="text-gsrp-teal-light/60 text-sm space-y-4 leading-relaxed">
              <p><strong className="text-white">Last Updated:</strong> July 2026</p>
              <p>Georgia State Roleplay ("GSRP", "we", "our") operates this dashboard and its associated services (verification, staff applications, training, the shop, the live server panel, transcripts, and staff tools). This Privacy Policy explains what information we collect, how we use it, and how it is stored and shared.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-white">Discord Information:</strong> When you authenticate via Discord OAuth, we receive your Discord user ID, username, global/display name, avatar, and your membership and roles in the GSRP server. This is used for access control and to display your identity within the dashboard.</li>
                <li><strong className="text-white">Discord Server List (Staff Intake):</strong> If you use a staff transfer or fast-pass intake request, we read the list of other Discord servers you are a member of (server names, icons, whether you own them, and your permissions in them, up to 25 servers) and forward that list to the GSRP staff team via Discord for review. We use this only to process your request.</li>
                <li><strong className="text-white">Roblox Information:</strong> During verification, your Roblox authentication code is forwarded to our Discord bot and is not stored by this service. Once linked, we store the association between your Discord account and your Roblox account (Roblox user ID and username) so we can display it and verify shop purchases.</li>
                <li><strong className="text-white">Application Data &amp; Integrity Monitoring:</strong> When you submit a staff or other application, we store your answers along with anti-cheat integrity signals collected while you complete the form: keystroke timing, paste events, a replayable typing timeline, tab-switching and window-focus events, mouse-leave and right-click events, idle periods, your detected operating system, your browser user agent, your IP address, and a timezone derived from your IP address.</li>
                <li><strong className="text-white">Quiz &amp; Training Results:</strong> Training quiz attempts, scores, answers, cooldowns, and ride-along scenario progress are stored for staff development and record-keeping.</li>
                <li><strong className="text-white">Shop &amp; Purchases:</strong> When you use the shop, we check whether your linked Roblox account owns the relevant Roblox game passes and store a record of the products you have claimed so rewards (such as Discord roles) are granted once.</li>
                <li><strong className="text-white">Server Data:</strong> When using the Live Panel, we proxy ERLC server data (player lists, staff lists, logs, moderation actions, and roleplay session records). Live player/presence data is held temporarily and is not persisted.</li>
                <li><strong className="text-white">Visitor &amp; Security Information:</strong> For anti-raid and security monitoring we collect your IP address, browser/device information, and the pages you visit. From your IP address we also derive geolocation and network data (country, region, city, approximate coordinates, ISP/organization, network/ASN, and proxy or VPN detection).</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Third-Party Services</h2>
              <p>We rely on the following third parties to provide the service. Data is shared with them only as needed for functionality:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-white">Discord:</strong> Authentication, role management, and delivery of notifications (including application, intake, and quiz records) to private staff channels via webhooks.</li>
                <li><strong className="text-white">Roblox:</strong> Account verification and game-pass ownership checks.</li>
                <li><strong className="text-white">ip-api.com:</strong> Your IP address is sent to this geolocation provider to determine timezone, location, and proxy/VPN status.</li>
                <li><strong className="text-white">Hosting &amp; Database Providers:</strong> Our application host and managed MySQL and MongoDB databases store the data described below.</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verify your membership and roles in the GSRP Discord server and determine access permissions</li>
                <li>Link your Roblox account for verification and shop purchase validation</li>
                <li>Display your Discord identity within the dashboard</li>
                <li>Process staff applications and verify their integrity (anti-cheat)</li>
                <li>Process staff transfer/fast-pass intake requests</li>
                <li>Record training and ride-along results for staff development</li>
                <li>Monitor visitor traffic, IP addresses, and proxy usage for anti-raid security</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Data Storage &amp; Retention</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-white">Session Cookies:</strong> Encrypted session cookies managed by NextAuth.js. These expire when your Discord token expires.</li>
                <li><strong className="text-white">MySQL Database:</strong> Applications (including the integrity signals above), transcript records, and shop claim records are stored in a secured database and retained for administrative purposes.</li>
                <li><strong className="text-white">MongoDB Database:</strong> Quiz attempts, ride-along records, and visitor logs and profiles. Visitor logs and profiles are automatically deleted after 7 days.</li>
                <li><strong className="text-white">In-Memory Cache:</strong> ERLC server and presence data is held temporarily in server memory and is not persisted.</li>
                <li><strong className="text-white">Discord:</strong> Application, intake, and quiz notifications are posted to private staff-only Discord channels and are retained there.</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Data Sharing</h2>
              <p>We do not sell or trade your personal information. Data is shared only with the third-party services listed above for the purpose of operating the dashboard, and application, intake, training, and moderation records are visible to authorized GSRP staff for review.</p>
              <p><strong className="text-white">Your IP address is never shared with, sold to, or disclosed to any outside party.</strong> It is used only internally for anti-raid security and, in the case of geolocation, sent solely to our IP-lookup provider (ip-api.com) to determine your approximate location and proxy status. It is never published, handed to other members, or given to any third party for any other purpose.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Your Rights</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>You may sign out at any time, which invalidates your session</li>
                <li>You may unlink your Roblox account from your Discord account</li>
                <li>You may request deletion of your application or quiz records by contacting GSRP staff</li>
                <li>Visitor logs and profiles are automatically removed after 7 days; transcript and administrative records are retained for record-keeping</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Contact</h2>
              <p>For any privacy-related questions or data requests, please contact the GSRP staff team via our Discord server.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
