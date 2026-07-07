import React from "react";
import { Shield, FileText, User, Hammer, Music, Flame, CreditCard, Radio, AlertCircle, Trash2, Mail, ArrowLeft, Globe } from "lucide-react";
// @ts-ignore
import logoUrl from "../assets/images/soundstream_logo_1782150206757.jpg";

interface TermsOfServicePageProps {
  onNavigate: (path: string) => void;
}

export default function TermsOfServicePage({ onNavigate }: TermsOfServicePageProps) {
  const sections = [
    { id: "user-accounts", title: "User Accounts", icon: <User className="w-5 h-5 text-purple-400" /> },
    { id: "acceptable-use", title: "Acceptable Use", icon: <Hammer className="w-5 h-5 text-indigo-400" /> },
    { id: "music-uploads", title: "Music Uploads", icon: <Music className="w-5 h-5 text-pink-500 animate-pulse" /> },
    { id: "copyright-dmca", title: "Copyright & DMCA", icon: <Shield className="w-5 h-5 text-yellow-500" /> },
    { id: "artist-content", title: "Artist Content", icon: <Flame className="w-5 h-5 text-amber-500" /> },
    { id: "payments-subscriptions", title: "Payments & Premium", icon: <CreditCard className="w-5 h-5 text-emerald-400" /> },
    { id: "advertising", title: "Advertising Policy", icon: <Radio className="w-5 h-5 text-blue-400" /> },
    { id: "limitation-liability", title: "Limitation of Liability", icon: <AlertCircle className="w-5 h-5 text-red-400" /> },
    { id: "account-termination", title: "Account Termination", icon: <Trash2 className="w-5 h-5 text-purple-400" /> },
    { id: "contact-info", title: "Contact Information", icon: <Mail className="w-5 h-5 text-indigo-400" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-300 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-12">
      {/* Background radial effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0c0c0e]/80 border-b border-white/5 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div 
            onClick={() => onNavigate("/")} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img 
              src={logoUrl} 
              alt="SoundStream logo" 
              className="w-9 h-9 rounded-xl border border-white/10 group-hover:scale-105 transition-transform" 
            />
            <div>
              <span className="font-sans font-black text-white text-lg tracking-tight block uppercase">
                SoundStream
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-bold block -mt-1">
                Independent Waves
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate("/")}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all border border-white/5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to App</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl mb-4 animate-pulse">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
            Terms of Service
          </h1>
          <p className="text-zinc-550 font-mono text-xs uppercase tracking-widest mt-2">
            Last updated: July 2, 2026 • Governing our website and native apps
          </p>
          <p className="text-zinc-400 text-sm mt-4 leading-relaxed">
            Welcome to SoundStream. By registering an account, streaming music, hosting media files, or connecting third-party profiles, you agree to comply with and be legally bound by this Terms of Service agreement.
          </p>
        </div>

        {/* Layout with sticky sidebar navigation for desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1 space-y-2 lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-none hidden lg:block">
            <p className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest font-bold mb-3 px-3">
              Agreement Sections
            </p>
            {sections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
              >
                {sec.icon}
                <span className="truncate">{sec.title}</span>
              </a>
            ))}
          </aside>

          {/* Content Sections */}
          <div className="lg:col-span-3 space-y-10">
            
            {/* 1. User Accounts */}
            <section id="user-accounts" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <User className="w-5 h-5 text-purple-400" />
                <span>1. User Accounts & Registration</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  To stream high-fidelity files, sync music, or participate as an independent creator, you must create a SoundStream account.
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    You agree to provide true, current, and complete email addresses and other user profile details.
                  </li>
                  <li>
                    You are solely responsible for protecting your password, sign-in sessions, and API tokens. SoundStream cannot and will not be liable for any unauthorized login actions resulting from credential compromise.
                  </li>
                  <li>
                    Accounts cannot be transferred or shared with secondary entities. If we discover account selling, sharing, or bot-controlled operations, the account will be immediately suspended.
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. Acceptable Use */}
            <section id="acceptable-use" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Hammer className="w-5 h-5 text-indigo-400" />
                <span>2. Acceptable Use Policy</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  Our goal is to foster a pristine, respectful platform for independent music. You agree strictly not to engage in any prohibited behaviors on our service, including:
                </p>
                <ul className="list-disc pl-5 space-y-2.5 text-zinc-400">
                  <li>
                    <strong className="text-zinc-300">Artificial Stream Inflation:</strong> Using automated bots, repeating streaming scripts, browser macros, or third-party click farms to artificially pump play counters, likes, or user follower numbers.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Data Scraping & Extraction:</strong> Executing automated crawlers, scrapers, indexers, or decompiling mechanisms to download music files, transcode streams, or harvest platform user directories.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Bypassing Restrictions:</strong> Modifying client applications to block advertisement structures, bypass DRM limits, or access administrative portals without authorizations.
                  </li>
                </ul>
              </div>
            </section>

            {/* 3. Music Uploads */}
            <section id="music-uploads" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Music className="w-5 h-5 text-pink-500 animate-pulse" />
                <span>3. Music Uploads & Streaming Media</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  Verified SoundStream Creators have the privilege to upload digital music files (FLAC, MP3, WAV formats) and host cover pictures:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    You must only upload content that you legally own, have created, or hold the express licensing rights to distribute globally.
                  </li>
                  <li>
                    Upload of copyrighted music belonging to major labels, bootlegs, unlicensed remixes, or cover tracks without mechanical licenses is strictly forbidden.
                  </li>
                  <li>
                    We utilize smart automated and peer-reviewed moderation pipelines. Songs found in violation of our content rules will be flagged, muted, or deleted.
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. Copyright and DMCA */}
            <section id="copyright-dmca" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Shield className="w-5 h-5 text-yellow-500" />
                <span>4. Copyright and DMCA Safe Harbor</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  We fully comply with the Digital Millennium Copyright Act of 1998 (DMCA). SoundStream respects the legal rights of publishers, lyricists, labels, and vocalists:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    If you believe your intellectual property has been uploaded on our servers without permission, please submit a formal takedown request containing the specific track URL and physical ownership signatures to our DMCA Agent at <span className="font-mono text-indigo-400 hover:underline">support@soundstreamy.com</span>.
                  </li>
                  <li>
                    We operate an expeditious safe-harbor removal protocol. Upon receiving a valid notice, we immediately disable the contested stream and notify the uploader.
                  </li>
                  <li>
                    A strict <strong className="text-red-400">Three-Strike Rule</strong> is applied. Uploaders with three copyright terminations will have their platform access cancelled permanently.
                  </li>
                </ul>
              </div>
            </section>

            {/* 5. Artist Content */}
            <section id="artist-content" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>5. Artist Content & Non-Exclusive Distribution Licensing</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  As an independent artist on SoundStream:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    You retain absolute 100% ownership, master rights, and intellectual copyrights to your original creations.
                  </li>
                  <li>
                    By uploading audio, video, or imagery, you grant SoundStream a non-exclusive, royalty-free, worldwide license to transcode, stream, host, index, and promote your media solely for the benefit of our users.
                  </li>
                  <li>
                    You can delete your songs or terminate your artist account at any moment. Deletion will automatically wipe the associated file blobs from our cloud databases within 7 business days.
                  </li>
                </ul>
              </div>
            </section>

            {/* 6. Payments and Subscriptions */}
            <section id="payments-subscriptions" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <span>6. Payments, Subscriptions & Premium Billing</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  SoundStream offers multiple subscription plans, including free (ad-supported) feeds and paid ad-free Premium streaming tiers:
                </p>
                <ul className="list-disc pl-5 space-y-2.5 text-zinc-400">
                  <li>
                    <strong className="text-zinc-300">Automatic Renewal:</strong> Paid Premium subscription charges are handled on a recurring billing cycle (monthly or annually) via authorized payment gateways.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Cancellation:</strong> You can cancel your Premium subscription tier at any point through your subscription settings panel. You will continue to enjoy Premium playback benefits until the final day of your active billing period.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Refunds:</strong> Since access is provided instantly, all Premium subscription sales are final and non-refundable, except where mandated by local consumer protection statutes.
                  </li>
                </ul>
              </div>
            </section>

            {/* 7. Advertising */}
            <section id="advertising" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Radio className="w-5 h-5 text-blue-400" />
                <span>7. Advertising & Platform Monetization</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  To keep independent music streaming accessible to everyone globally, we include digital advertisement streams (such as banner placements and rewarded video pop-ups powered by AdMob integrations):
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    Free-tier listeners agree to the presentation of visual and audio advertisements during their playback sessions.
                  </li>
                  <li>
                    We strictly forbid the use of ad-blocking extensions or modified client-side scripts to suppress these advertisements. If we detect ad-blockers, your streaming experience may be restricted or suspended.
                  </li>
                  <li>
                    Ad content is handled by third-party ad exchanges. SoundStream does not explicitly endorse any third-party products, services, or campaigns advertised on the platform.
                  </li>
                </ul>
              </div>
            </section>

            {/* 8. Limitation of Liability */}
            <section id="limitation-liability" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span>8. Limitation of Liability</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  To the maximum extent permitted under applicable law, SoundStream, its subsidiaries, executives, and developer network provide all services strictly on an <strong className="text-white">"as is"</strong> and <strong className="text-white">"as available"</strong> foundation:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    We do not warrant that streaming feeds will be uninterrupted, error-free, completely immune to latency spikes, or safe from temporary server offline times.
                  </li>
                  <li>
                    In no event shall SoundStream be held accountable for any indirect, consequential, punitive, or accidental losses arising out of your inability to access, stream, upload, or manage music files on our platform.
                  </li>
                </ul>
              </div>
            </section>

            {/* 9. Account Termination */}
            <section id="account-termination" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Trash2 className="w-5 h-5 text-purple-400" />
                <span>9. Account Termination</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  We value a safe music ecosystem. SoundStream reserves the sovereign authority to terminate or suspend user access to our platform at our sole discretion, without prior notice:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    If you violate any provisions outlined in this agreement or engage in stream manipulation.
                  </li>
                  <li>
                    If requested by authorized government bodies or legal copyright holders.
                  </li>
                  <li>
                    You can close your account at any moment through your user profile settings. Once deleted, all playlists and personal metrics will be permanently purged.
                  </li>
                </ul>
              </div>
            </section>

            {/* 10. Contact Info */}
            <section id="contact-info" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>10. Contact Information</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  If you have queries regarding this legal agreement, DMCA compliance, premium subscription billing, or platform rules, please reach out to our legal team:
                </p>
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-white/5 space-y-2">
                  <p className="text-zinc-400 font-sans text-xs">
                    <strong className="text-white">Legal & Compliance Email:</strong> <a href="mailto:support@soundstreamy.com" className="text-indigo-400 hover:underline font-mono">support@soundstreamy.com</a>
                  </p>
                  <p className="text-zinc-400 font-sans text-xs">
                    <strong className="text-white">Mailing Headquarters:</strong> SoundStream Legal, 100 Studio Way, San Francisco, CA 94103
                  </p>
                  <p className="text-zinc-400 font-sans text-xs">
                    <strong className="text-white">Help Desk:</strong> Submit a support ticket directly via the <strong className="text-indigo-300">Legal & Help Center</strong> within the application.
                  </p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-white/5 pt-12 max-w-6xl mx-auto px-4 sm:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8">
          <div className="text-center md:text-left">
            <p className="text-xs text-zinc-550 font-mono uppercase tracking-widest font-extrabold">
              SoundStream Streaming Network
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Empowering label-free independent audio art.
            </p>
          </div>

          {/* Footer links */}
          <div className="flex flex-wrap justify-center gap-6">
            <button 
              onClick={() => onNavigate("/")} 
              className="text-xs text-zinc-400 hover:text-white transition-all uppercase tracking-wider font-extrabold cursor-pointer"
            >
              Home
            </button>
            <button 
              onClick={() => onNavigate("/privacy")} 
              className="text-xs text-zinc-400 hover:text-white transition-all uppercase tracking-wider font-extrabold cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => onNavigate("/terms")} 
              className="text-xs text-indigo-400 font-extrabold hover:text-indigo-300 transition-all uppercase tracking-wider cursor-pointer"
            >
              Terms of Service
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 py-6 text-center">
          <p className="text-[10px] font-mono text-zinc-600">
            &copy; {new Date().getFullYear()} SoundStream Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
