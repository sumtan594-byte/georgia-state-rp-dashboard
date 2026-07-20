import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
            <h1 className="text-white font-bold text-2xl mb-6">Terms of Service</h1>
            <div className="text-gsrp-teal-light/60 text-sm space-y-4 leading-relaxed">
              <p><strong className="text-white">Last Updated:</strong> July 2026</p>
              <p>By accessing or using the Georgia State Roleplay ("GSRP") dashboard and its associated services, you agree to be bound by these Terms of Service. Your use of the dashboard is also governed by our <Link href="/privacy-policy" className="text-gsrp-orange-light hover:text-gsrp-orange transition-colors">Privacy Policy</Link>.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Eligibility</h2>
              <p>You must be a member of the GSRP Discord server to access this dashboard. Specific features require additional Discord roles as determined by the GSRP staff team.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Acceptable Use</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>You may only access transcripts that you own or have been granted permission to view</li>
                <li>You may not attempt to bypass role-based access controls</li>
                <li>You may not use the Live Panel to execute restricted or harmful commands</li>
                <li>You may not share your session credentials with other users</li>
                <li>You may not abuse, exploit, or attempt to disrupt any service</li>
                <li>You may not use bots, scripts, automation, or another person to complete applications, quizzes, or ride-along training on your behalf</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Transcripts</h2>
              <p>Transcripts are records of Discord support tickets. Access is restricted to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>The user who opened the ticket (identified by Discord ID)</li>
                <li>Users with the All Transcripts role</li>
                <li>Server administrators</li>
              </ul>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Live Panel</h2>
              <p>The Live Panel provides access to ERLC server management features. Usage is restricted to users with the Panel role. All commands are logged and rate-limited. Abuse of panel access will result in role removal.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Applications</h2>
              <p>When you submit a staff or other application, we record your answers together with integrity signals (such as keystroke timing, paste events, a typing timeline, and window-focus activity) to detect cheating and dishonest submissions, as described in our Privacy Policy. Submitting an application constitutes consent to this monitoring. Applications must be your own original work; falsified, plagiarized, or automated submissions may be rejected and may result in loss of access.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Staff Intake</h2>
              <p>The staff transfer and fast-pass intake requests use Discord OAuth to read your account details and your list of Discord servers, which are forwarded to the GSRP staff team for review. Initiating an intake request authorizes this. You must provide accurate information and only submit requests that apply to you.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Shop</h2>
              <p>The shop verifies purchases by checking whether your linked Roblox account owns the relevant Roblox game pass. Rewards, such as Discord roles, are granted only after ownership is verified. All Roblox purchases are made through Roblox and are subject to Roblox's own terms; GSRP does not process payments and does not issue refunds for Roblox transactions. Attempting to claim rewards without a genuine purchase is prohibited.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Training</h2>
              <p>The Staff Training quiz is designed to test knowledge of the GSRP Staff Handbook. A minimum passing score is required, and ride-along scenarios may also be required. Quiz and ride-along results are stored for administrative review.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Verification</h2>
              <p>The Verification service links your Roblox account to your Discord account. This process is handled via Discord OAuth and Roblox authentication. Your Roblox auth code is forwarded to our Discord bot and is not stored by this service.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Termination</h2>
              <p>GSRP staff reserves the right to revoke access to any or all services at any time, for any reason, without notice.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Changes</h2>
              <p>We may update these Terms at any time. Continued use of the services after changes constitutes acceptance of the new Terms.</p>

              <h2 className="text-white font-bold text-lg mt-6 mb-2">Contact</h2>
              <p>For questions about these Terms, please contact the GSRP staff team via our Discord server.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
