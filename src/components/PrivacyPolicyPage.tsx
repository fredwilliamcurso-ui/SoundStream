import React from "react";
import { Shield, Lock, Database, UserCheck, Cookie, Bell, Share2, HelpCircle, ArrowLeft, Mail, Flame, Sparkles } from "lucide-react";
// @ts-ignore
import logoUrl from "../assets/images/soundstream_logo_1782150206757.jpg";

interface PrivacyPolicyPageProps {
  onNavigate: (path: string) => void;
}

export default function PrivacyPolicyPage({ onNavigate }: PrivacyPolicyPageProps) {
  const sections = [
    { id: "info-collected", title: "Information Collected", icon: <Database className="w-5 h-5 text-purple-400" /> },
    { id: "account-data", title: "Account Data", icon: <UserCheck className="w-5 h-5 text-indigo-400" /> },
    { id: "google-signin", title: "Google Sign-In", icon: <Sparkles className="w-5 h-5 text-amber-400" /> },
    { id: "tiktok-login", title: "TikTok Login", icon: <Flame className="w-5 h-5 text-pink-500 animate-pulse" /> },
    { id: "firebase-services", title: "Firebase Services", icon: <Shield className="w-5 h-5 text-yellow-500" /> },
    { id: "analytics", title: "Analytics & Insights", icon: <Share2 className="w-5 h-5 text-blue-400" /> },
    { id: "cookies", title: "Cookies & Storage", icon: <Cookie className="w-5 h-5 text-amber-500" /> },
    { id: "push-notifications", title: "Push Notifications", icon: <Bell className="w-5 h-5 text-emerald-400" /> },
    { id: "third-party", title: "Third-Party Services", icon: <Share2 className="w-5 h-5 text-purple-400" /> },
    { id: "user-rights", title: "Your Sovereign Rights", icon: <Lock className="w-5 h-5 text-red-400" /> },
    { id: "contact-info", title: "Contact Information", icon: <Mail className="w-5 h-5 text-indigo-400" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-300 font-sans antialiased selection:bg-indigo-500 selection:text-white pb-12">
      {/* Background radial effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full filter blur-3xl pointer-events-none" />

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
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
            Privacy Policy
          </h1>
          <p className="text-zinc-550 font-mono text-xs uppercase tracking-widest mt-2">
            Last updated: July 2, 2026 • Effective immediately
          </p>
          <p className="text-zinc-400 text-sm mt-4 leading-relaxed">
            At SoundStream, we believe privacy is a fundamental human right. This document details how we collect, protect, process, and secure your personal data in compliance with GDPR, CCPA, and global security standards.
          </p>
        </div>

        {/* Layout with sticky sidebar navigation for desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Nav */}
          <aside className="lg:col-span-1 space-y-2 lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-none hidden lg:block">
            <p className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest font-bold mb-3 px-3">
              Policy Sections
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
            
            {/* 1. Information Collected */}
            <section id="info-collected" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Database className="w-5 h-5 text-purple-400" />
                <span>1. Information We Collect</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  To provide an exceptional, high-fidelity, and lag-free music streaming experience, we collect specific information about our users. This collection is limited to data that is strictly necessary to run, optimize, and secure our services.
                </p>
                <p>We classify the collected information into three categories:</p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    <strong className="text-zinc-300">Information you provide:</strong> This includes email address, customized usernames, profile photos, passwords, artist names, bios, and any audio/video material you directly publish.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Information collected automatically:</strong> Streaming metadata (such as play sessions, skipped tracks, loop settings, liked songs, followed creators), device configurations (operating system, browser, screen size, language), and diagnostic logs.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Third-Party Integration Data:</strong> Metrics shared when linking Google Sign-In, YouTube Sync, or TikTok authentication as detailed below.
                  </li>
                </ul>
              </div>
            </section>

            {/* 2. Account Data */}
            <section id="account-data" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <span>2. Account Data</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  Your account identity is stored securely. SoundStream isolates account data to protect your platform experience and billing details:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    Your credential history (email hash, OAuth tokens) is encrypted in-transit and at-rest.
                  </li>
                  <li>
                    We never share, rent, or trade your personal account identifiers with data brokers or marketing lists.
                  </li>
                  <li>
                    As a user, you maintain complete ownership of your playlists, bookmarks, listening history, and user settings.
                  </li>
                </ul>
              </div>
            </section>

            {/* 3. Google Sign-In */}
            <section id="google-signin" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>3. Google Sign-In</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  To simplify your account creation process, we offer integration with Google Identity services. When choosing to login via Google Sign-In:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    We request access to your primary email address, profile photo URL, and registered display name.
                  </li>
                  <li>
                    This process uses OAuth 2.0. We never receive or store your Google password.
                  </li>
                  <li>
                    You can revoke SoundStream’s access to your Google account at any time via your Google Account security settings.
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. TikTok Login */}
            <section id="tiktok-login" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Flame className="w-5 h-5 text-pink-500 animate-pulse" />
                <span>4. TikTok Login & Integration</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  SoundStream includes integrations for TikTok creators to link their profiles and sync social activities. When you authorize TikTok Login:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    We receive a secure open identifier (Open ID), your public TikTok username (e.g., <code>@username</code>), and an authorization access token.
                  </li>
                  <li>
                    We use this data solely to bind your TikTok profile to your SoundStream catalog and, if you are a verified creator, display your latest public short video clips on your creator page.
                  </li>
                  <li>
                    All TikTok OAuth codes are exchanged server-side via TLS 1.3. Your personal credentials are never exposed to clients. You can instantly unlink your TikTok profile via your settings panel.
                  </li>
                </ul>
              </div>
            </section>

            {/* 5. Firebase Services */}
            <section id="firebase-services" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Shield className="w-5 h-5 text-yellow-500" />
                <span>5. Firebase Infrastructure Services</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  We utilize Google Firebase services as our back-end infrastructure provider to power high-speed real-time updates and rock-solid storage:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    <strong className="text-zinc-300">Firebase Authentication:</strong> Manages sign-up, sign-in, token validation, and password reset flows securely.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Cloud Firestore:</strong> Stores real-time application database structures such as song records, playlist tracks, user profiles, and favorites.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Firebase Cloud Storage:</strong> Safely stores uploaded audio streams, cover artwork pictures, and video feeds.
                  </li>
                </ul>
                <p>
                  Data handled by Firebase is stored in highly secure global cloud regions and is shielded by strict Firestore rules that prevent unauthorized database manipulation or scraping.
                </p>
              </div>
            </section>

            {/* 6. Analytics */}
            <section id="analytics" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Share2 className="w-5 h-5 text-blue-400" />
                <span>6. Analytics & Diagnostic Insights</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  To constantly debug streaming lag, audio decoders, and enhance recommendations, we gather performance metrics and user journeys:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    We track app crashes, rendering lags, and audio playback failures to our isolated diagnostic logs.
                  </li>
                  <li>
                    We measure user interactions (which buttons are clicked, search queries, general usage duration) to improve user flows.
                  </li>
                  <li>
                    All analytical insights are completely anonymized or pseudonymous. We do not correlate diagnostic metrics with physical coordinates or real-world identities.
                  </li>
                </ul>
              </div>
            </section>

            {/* 7. Cookies */}
            <section id="cookies" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Cookie className="w-5 h-5 text-amber-500" />
                <span>7. Cookies & Local Browser Storage</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  SoundStream uses standard browser cookies, LocalStorage, and IndexedDB protocols to keep you logged in and support features like offline listening:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    <strong className="text-zinc-300">Essential Storage:</strong> Used to maintain your active login session token and audio volume configurations. Disabling these will sign you out.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Offline Caching:</strong> Audio tracks, metadata files, and imagery are temporarily cached on your local device for offline playback and low network consumption.
                  </li>
                  <li>
                    You can manage cookie settings directly in your browser preferences. Removing cookies will require a new login.
                  </li>
                </ul>
              </div>
            </section>

            {/* 8. Push Notifications */}
            <section id="push-notifications" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Bell className="w-5 h-5 text-emerald-400" />
                <span>8. Push Notifications</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  If you choose to receive platform push notifications:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    We will notify you of newly published music from creators you follow, playlist changes, or critical security alerts.
                  </li>
                  <li>
                    We store an anonymous browser notification token to deliver these updates. We never use this token to push external advertisements.
                  </li>
                  <li>
                    You can toggle notification permissions off at any moment in your system/browser notification preferences.
                  </li>
                </ul>
              </div>
            </section>

            {/* 9. Third-Party Services */}
            <section id="third-party" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Share2 className="w-5 h-5 text-purple-400" />
                <span>9. Third-Party Services Integration</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  SoundStream integrates certain third-party services to enrich its music experience (such as AdMob for advertisement banners, monetization portals, and Unsplash for legal placeholder artwork):
                </p>
                <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                  <li>
                    These partners may gather non-sensitive technical device logs or set independent tracking codes.
                  </li>
                  <li>
                    We mandate that all integrated platforms conform strictly to global privacy standards and allow users to opt-out via consent banners.
                  </li>
                </ul>
              </div>
            </section>

            {/* 10. User Rights */}
            <section id="user-rights" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Lock className="w-5 h-5 text-red-400" />
                <span>10. Your Sovereign Rights (GDPR & CCPA)</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  Regardless of your country of residence, we extend comprehensive digital rights over your personal metrics:
                </p>
                <ul className="list-disc pl-5 space-y-2.5 text-zinc-400">
                  <li>
                    <strong className="text-zinc-300">Right of Access:</strong> You can request a complete file of all your data stored in our database.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Right to Rectification:</strong> You can edit your username, email, artist details, and public profile data instantly.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Right to Erasure (Forget Me):</strong> You have the right to demand that we permanently wipe your account and history from our database.
                  </li>
                  <li>
                    <strong className="text-zinc-300">Right to Restrict Processing:</strong> You can disable analytical cookies, notification tokens, and ad-personalization toggles.
                  </li>
                </ul>
                <p>
                  To invoke any of these rights, contact our privacy department via the options detailed below.
                </p>
              </div>
            </section>

            {/* 11. Contact Info */}
            <section id="contact-info" className="bg-zinc-900/40 border border-white/5 rounded-2xl p-6 sm:p-8 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5 border-b border-white/5 pb-3">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>11. Contact Information</span>
              </h2>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-350">
                <p>
                  For questions about your data safety, GDPR procedures, or to request a permanent account termination, please contact our Data Protection Officer:
                </p>
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-white/5 space-y-2">
                  <p className="text-zinc-400 font-sans text-xs">
                    <strong className="text-white">Email:</strong> <a href="mailto:privacy@soundstreamy.com" className="text-indigo-400 hover:underline font-mono">privacy@soundstreamy.com</a>
                  </p>
                  <p className="text-zinc-400 font-sans text-xs">
                    <strong className="text-white">Postal Address:</strong> SoundStream Privacy Office, 100 Studio Way, San Francisco, CA 94103
                  </p>
                  <p className="text-zinc-400 font-sans text-xs">
                    <strong className="text-white">Technical Support:</strong> <a href="mailto:support@soundstreamy.com" className="text-indigo-400 hover:underline font-mono">support@soundstreamy.com</a>
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
              className="text-xs text-indigo-400 font-extrabold hover:text-indigo-300 transition-all uppercase tracking-wider cursor-pointer"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => onNavigate("/terms")} 
              className="text-xs text-zinc-400 hover:text-white transition-all uppercase tracking-wider font-extrabold cursor-pointer"
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
