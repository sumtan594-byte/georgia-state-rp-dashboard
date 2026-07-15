import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy, GSRP</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full animate-fade-in-up">
          <Link href="/" className="inline-flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange-light text-[10px] font-bold uppercase tracking-widest transition-colors mb-8 cursor-pointer">
            <ArrowLeft size={12} /> Back to Dashboard
          </Link>
          <div className="card-glass rounded-2xl p-8 shadow-2xl">
            <h1 className="text-white font-bold text-2xl mb-6">Privacy Policy</h1>
            <div className="text-gsrp-teal-light/60 text-sm space-y-4 leading-relaxed">
              <p><strong className="text-white">Last Updated:</strong> May 2026</p>
              <p>Georgia State Roleplay ("GSRP", "we", "our") operates this verification portal and associated services. This Privacy Policy explains how we collect, use, and protect your information.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Information We Collect</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-white">Discord Information:</strong> When you authenticate via Discord OAuth, we receive your Discord user ID, username, avatar, and guild membership/roles. This is used solely for access control.</li>
                <li><strong className="text-white">Roblox Information:</strong> During verification, your Roblox auth code is forwarded to our Discord bot via webhook. We do not store your Roblox credentials.</li>
                <li><strong className="text-white">Quiz Results:</strong> Training quiz scores and answers are stored in a GitHub repository for record-keeping purposes.</li>
                <li><strong className="text-white">Server Data:</strong> When using the Live Panel, we proxy ERLC server data (player lists, staff lists, logs). This data is not stored persistently.</li>
                <li><strong className="text-white">Visitor Information:</strong> We collect your IP address and device type for anti-raid traffic monitoring and security purposes.</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Verify your membership in the GSRP Discord server</li>
                <li>Check your Discord roles to determine access permissions</li>
                <li>Link your Roblox account for citizenship verification</li>
                <li>Display your Discord username and avatar within the dashboard</li>
                <li>Record training quiz results for staff development tracking</li>
                <li>Monitor visitor traffic and IP addresses to ensure valid anti-raid security</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Data Storage</h2>
              <p>We use the following storage mechanisms:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-white">Session Cookies:</strong> Encrypted session cookies managed by NextAuth.js. These expire when your Discord token expires.</li>
                <li><strong className="text-white">GitHub Repository:</strong> Transcript HTML files and quiz attempt records are stored in a private GitHub repository.</li>
                <li><strong className="text-white">In-Memory Cache:</strong> ERLC server data and presence information is held temporarily in server memory and is not persisted.</li>
                <li><strong className="text-white">Visitor Database:</strong> IP addresses, browser/device information, and page visits are stored in a secured database for anti-raid monitoring. This data is retained for a rolling period for security purposes.</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Data Sharing</h2>
              <p>We do not sell, trade, or share your personal information with third parties. Your Discord information is only used to communicate with the Discord API for authentication purposes.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Your Rights</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>You may sign out at any time, which invalidates your session</li>
                <li>You may request deletion of your quiz records by contacting GSRP staff</li>
                <li>Transcript records are retained for administrative purposes</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Contact</h2>
              <p>For any privacy-related questions, please contact the GSRP staff team via our Discord server.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
