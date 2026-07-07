import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { User } from "../types";
import { Mail, Shield, FileText, AlertCircle, Send, CheckCircle2, Heart, Loader2 } from "lucide-react";
import { analytics } from "../lib/analytics";

interface LegalAndSupportProps {
  currentUser: User | null;
}

export default function LegalAndSupport({ currentUser }: LegalAndSupportProps) {
  const [activeSubTab, setActiveSubTab] = useState<"privacy" | "terms" | "dmca" | "contact" | "donate">("privacy");
  
  // Support form state
  const [email, setEmail] = useState(currentUser?.email || "");

  // Donation state and triggers
  const [selectedDonationPreset, setSelectedDonationPreset] = useState<number>(15);
  const [customDonationAmount, setCustomDonationAmount] = useState<string>("");
  const [isDonating, setIsDonating] = useState(false);
  const [donationError, setDonationError] = useState("");

  const handleInitiateDonation = async () => {
    setIsDonating(true);
    setDonationError("");
    const finalAmount = customDonationAmount ? parseFloat(customDonationAmount) : selectedDonationPreset;

    if (isNaN(finalAmount) || finalAmount <= 0) {
      setDonationError("Please enter a valid donation amount greater than $0.");
      setIsDonating(false);
      return;
    }

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser?.uid || "anonymous_backer",
          email: currentUser?.email || email || "",
          packageId: "donation",
          amount: finalAmount,
          customName: "SoundStream Support Donation"
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to establish a secure checkout session.");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Stripe checkout URL is missing.");
      }
    } catch (err: any) {
      console.error("❌ Stripe donation error:", err);
      setDonationError(err.message || "Failed to initiate secure donation.");
      setIsDonating(false);
    }
  };
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !subject || !message) {
      setSubmitError("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);

    try {
      await addDoc(collection(db, "support_tickets"), {
        email,
        subject,
        category,
        message,
        status: "open",
        userId: currentUser?.uid || "guest",
        createdAt: new Date().toISOString()
      });

      // Track support request event
      await analytics.trackEvent("retention_ping", currentUser?.uid, currentUser?.email, {
        action: "submit_support_ticket",
        category
      });

      setSubmitSuccess(true);
      setSubject("");
      setMessage("");
    } catch (err: any) {
      console.error("Error submitting support ticket:", err);
      setSubmitError("Failed to submit support ticket. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-4 font-sans text-zinc-300">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-indigo-400" />
          <span>Legal & Help Center</span>
        </h1>
        <p className="text-zinc-400 text-sm">
          Everything about your privacy, copyright safety, terms of use, and live support requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 mb-6 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveSubTab("privacy")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "privacy"
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Privacy Policy</span>
        </button>
        <button
          onClick={() => setActiveSubTab("terms")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "terms"
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Terms of Service</span>
        </button>
        <button
          onClick={() => setActiveSubTab("dmca")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "dmca"
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Copyright & DMCA</span>
        </button>
        <button
          onClick={() => setActiveSubTab("contact")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "contact"
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Contact & Support</span>
        </button>
        <button
          onClick={() => setActiveSubTab("donate")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === "donate"
              ? "border-indigo-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Heart className="w-4 h-4 text-rose-400 fill-rose-500/10" />
          <span>Support SoundStream</span>
        </button>
      </div>

      {/* Content panes */}
      <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm min-h-[400px]">
        {activeSubTab === "privacy" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>SoundStream Privacy Policy</span>
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Last Updated: June 26, 2026 | Effective immediately for all global listeners
            </p>

            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                At <strong>SoundStream</strong>, we are committed to protecting the privacy, identity, and security of our music listeners and creators worldwide. This Privacy Policy details how we collect, process, secure, and share your personal data in strict compliance with the General Data Protection Regulation (<strong>GDPR</strong>), the California Consumer Privacy Act (<strong>CCPA</strong>), and global data protection guidelines.
              </p>

              <div>
                <h3 className="text-white font-bold mb-1">1. Information We Collect</h3>
                <p>To deliver a highly customized and stable streaming feed, we collect:</p>
                <ul className="list-disc pl-5 mt-1 text-zinc-400 space-y-1">
                  <li><strong>Account Credentials</strong>: Username, Email, Profile Picture, and Subscription Tier.</li>
                  <li><strong>Listening & Platform Insights</strong>: Detailed play histories, skipped tracks, liked songs, created playlists, and following trends.</li>
                  <li><strong>Device Metrics</strong>: Platform identifiers (Web vs Android native), general IP-based geolocation, network latency statistics, and app diagnostics.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">2. How We Use Your Data</h3>
                <p>We process your personal data under legal, contractually required, and legitimate business grounds:</p>
                <ul className="list-disc pl-5 mt-1 text-zinc-400 space-y-1">
                  <li>To provide personalized feeds, recommendations, and custom local-cached offline playback.</li>
                  <li>To track ad conversions and premium status entitlements correctly.</li>
                  <li>To process artist royalties based on real play events and track listening statistics securely.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">3. GDPR Rights & Your Control</h3>
                <p>If you are residing in the European Union (EU) or European Economic Area (EEA), you possess the following sovereign rights:</p>
                <ul className="list-disc pl-5 mt-1 text-zinc-400 space-y-1">
                  <li><strong>Right to Access</strong>: Obtain complete copies of all records of your data.</li>
                  <li><strong>Right to Rectification</strong>: Instantly correct obsolete, erroneous or incomplete metrics.</li>
                  <li><strong>Right to Erasure (Right to be Forgotten)</strong>: Delete your entire account and associated streaming metadata permanently.</li>
                  <li><strong>Right to Opt-Out</strong>: Modify your GDPR choices, personalized ad preferences, and data tracking at any time via the consent banner.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">4. Secure Data Retention</h3>
                <p>
                  We store your personal data only as long as your account remains active or to verify billing entitlements. All databases are heavily encrypted over transport layer security (TLS 1.3) and kept in resilient secure cloud vaults.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">5. Contact Our Data Protection Officer</h3>
                <p>
                  For absolute transparency or any severe privacy issues, please contact our Data Protection Officer at <span className="font-mono text-indigo-400 underline">support@soundstreamy.com</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "terms" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Terms of Service Agreement</span>
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Last Updated: June 26, 2026 | Governing soundstreamy.com and native applications
            </p>

            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                By creating an account, syncing your YouTube tracks, or streaming audio streams on <strong>SoundStream</strong>, you are legally entering a binding contract with SoundStream Inc. If you disagree with any terms, please discontinue using our platforms immediately.
              </p>

              <div>
                <h3 className="text-white font-bold mb-1">1. User Accountability & Registration</h3>
                <p>
                  You are solely accountable for shielding your account secrets. All registrants must provide legitimate emails. Automated bots, scraping engines, or distributed crawler registrations are strictly prohibited.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">2. Licensing of User-Generated Content</h3>
                <p>
                  Independent creators retain absolute ownership of original tracks, artwork, and metadata they publish. By uploading content, you grant SoundStream a non-exclusive, royalty-free, worldwide license to transcode, store, distribute, and play your audio streams exclusively for platform users. You affirm that you hold all master rights and publishing licenses for your uploaded works.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">3. Allowed Usage Rules</h3>
                <p>You strictly agree NOT to:</p>
                <ul className="list-disc pl-5 mt-1 text-zinc-400 space-y-1">
                  <li>Upload any third-party copyrighted tracks, rip-offs, or bootlegs without authorized legal clearance.</li>
                  <li>Manipulate listening counters, stream loops, or play counts using bots, click farms, or malicious browser scripts.</li>
                  <li>Attempt to decompile, bypass digital rights management (DRM), or rip music directly from the streaming buffer.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">4. Subscriptions & Premium Billing</h3>
                <p>
                  We offer Free (Ad-supported) and Premium tiers. Premium charges recur automatically monthly or yearly. You can cancel your subscription at any time without fee penalties, and you will retain access until the end of your billing cycle.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">5. Limitation of Liability</h3>
                <p>
                  SoundStream provides all services "as is" and "as available". We do not guarantee uninterrupted server uptime, nor are we liable for any structural, indirect, or accidental data loss resulting from network service disruptions.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "dmca" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-indigo-400" />
              <span>Copyright and DMCA Takedown Policy</span>
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              SoundStream Content Intellectual Property & Safe Harbor Procedures
            </p>

            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                As an independent creator platform, SoundStream respects the copyright ownership of artists, publishers, and labels. We fully comply with the Digital Millennium Copyright Act of 1998 (<strong>DMCA</strong>).
              </p>

              <div>
                <h3 className="text-white font-bold mb-1">1. How to File a Takedown Notice</h3>
                <p>
                  If you identify any user-uploaded track, lyric, or image that infringes on your copyright, you can submit a formal DMCA Takedown Request. To be legally valid, your notification must include:
                </p>
                <ul className="list-disc pl-5 mt-1 text-zinc-400 space-y-1.5">
                  <li>A physical or electronic signature of the copyright owner or their authorized agent.</li>
                  <li>Precise identification of the copyrighted work claimed to have been infringed.</li>
                  <li>Direct links or identifiers of the specific SoundStream track, album, or creator profile.</li>
                  <li>Your complete contact details: legal name, physical address, phone number, and professional email.</li>
                  <li>A formal statement that you have a good-faith belief that the use of the material is unauthorized.</li>
                  <li>A statement, under penalty of perjury, that the info in your notice is completely accurate.</li>
                </ul>
              </div>

              <div className="bg-indigo-950/25 border border-indigo-500/10 rounded-xl p-4 my-2">
                <p className="text-xs text-indigo-300 font-semibold mb-1">Official Designated Copyright Agent:</p>
                <p className="text-xs text-zinc-300 leading-normal">
                  SoundStream Legal - Copyright Dept.<br />
                  Email: <span className="underline font-mono text-indigo-400">support@soundstreamy.com</span><br />
                  Address: SoundStream HQ, 100 Studio Way, San Francisco, CA 94103
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">2. Safe Harbor & Expeditious Removal</h3>
                <p>
                  Upon receipt of a valid and complete DMCA notice, we act expeditiously to remove or disable access to the contested material. We will immediately inform the uploading creator.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">3. Counter-Notifications</h3>
                <p>
                  If a creator believes their track was mistakenly restricted, they can submit a formal Counter-Notification to our agent outlining their ownership rights, following which we will restore the content within 10-14 business days unless the copyright owner files a formal lawsuit.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-1">4. Repeat Infringer Policy</h3>
                <p>
                  SoundStream implements a strict three-strike policy. Creators who repeatedly upload unlicensed copyrighted materials will have their artist privileges revoked and their accounts terminated permanently.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "contact" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-400" />
                <span>Contact support@soundstreamy.com</span>
              </h2>
              <p className="text-zinc-400 text-sm mt-1">
                Have billing issues, feedback, copyright reports, or account questions? Submit a ticket and our 24/7 global support team will respond within 1-2 hours.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* Form */}
              <form onSubmit={handleSupportSubmit} className="space-y-4 md:col-span-3">
                {submitSuccess && (
                  <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Ticket Submitted Successfully!</p>
                      <p className="text-xs text-emerald-500 mt-0.5">
                        We have logged your query. Our support team at <span className="font-mono">support@soundstreamy.com</span> will get back to you shortly.
                      </p>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="p-4 bg-red-950/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Your Contact Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Help Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="general">General Inquiry</option>
                      <option value="billing">Premium Billing / Upgrades</option>
                      <option value="artist">Artist Account / Uploads</option>
                      <option value="copyright">Copyright & DMCA Notice</option>
                      <option value="bug">Technical Bug / Issues</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Subject Line <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Upgrade billing failure"
                      className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Detailed Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your request in detail. If reporting a copyright issue, include links."
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-550 disabled:bg-indigo-700/50 text-white font-extrabold uppercase text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-650/25"
                >
                  {isSubmitting ? (
                    <span>Submitting Ticket...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Support Ticket</span>
                    </>
                  )}
                </button>
              </form>

              {/* Side Card */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-2">Direct Contact</h3>
                  <p className="text-xs text-zinc-400 leading-normal mb-3">
                    Prefer direct email? Send a message straight from your client:
                  </p>
                  <p className="font-mono text-xs text-indigo-400 font-extrabold bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-500/10 text-center select-all">
                    support@soundstreamy.com
                  </p>
                </div>

                <div className="bg-zinc-950/50 border border-white/5 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-2">Helpful Tip</h3>
                  <p className="text-xs text-zinc-400 leading-normal">
                    For faster resolution of premium subscription issues, please include the email linked to your account and the transaction timestamp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeSubTab === "donate" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/10" />
              <span>Support SoundStream (Secure Donation Gateway)</span>
            </h2>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Optional Contribution | Supporting independent artists & developer team
            </p>

            <div className="bg-[#050508]/40 border border-white/5 rounded-2xl p-6 sm:p-10 text-center max-w-2xl mx-auto space-y-6">
              <p className="text-sm text-zinc-350 leading-relaxed">
                Listeners, visitors, and registered users can all use SoundStream **FREE** without subscribing.
                The donation is simply for people who enjoy SoundStream and want to support its ongoing development and hosting.
              </p>

              {/* Donation Amount Selector */}
              <div className="space-y-4 text-left border-y border-white/5 py-6">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Select Donation Amount
                </label>
                <div className="grid grid-cols-5 gap-2.5">
                  {[5, 15, 30, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSelectedDonationPreset(preset);
                        setCustomDonationAmount("");
                      }}
                      className={`py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        selectedDonationPreset === preset && !customDonationAmount
                          ? "bg-rose-600 border border-rose-500 text-white shadow-md shadow-rose-600/10"
                          : "bg-white/5 border border-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      ${preset}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Or Enter Custom Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter custom amount (e.g. 25)"
                    value={customDonationAmount}
                    onChange={(e) => {
                      setCustomDonationAmount(e.target.value);
                      setSelectedDonationPreset(0);
                    }}
                    className="w-full px-4 py-3 bg-black/60 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-rose-500 font-semibold"
                  />
                </div>
              </div>

              {donationError && (
                <p className="text-xs text-rose-450 font-bold bg-rose-950/10 border border-rose-500/20 py-2.5 px-4 rounded-xl">
                  ⚠️ {donationError}
                </p>
              )}

              <div className="py-2">
                <button
                  onClick={handleInitiateDonation}
                  disabled={isDonating}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-600 hover:to-indigo-700 text-white font-extrabold text-xs tracking-wider uppercase px-8 py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isDonating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting Secure Gateway...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 text-white fill-white animate-pulse" />
                      <span>Support with ${customDonationAmount ? parseFloat(customDonationAmount) || 0 : selectedDonationPreset}</span>
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-xs text-zinc-500 leading-normal">
                You will be redirected to our secure PCI-DSS compliant Stripe checkout page. Thank you for your kindness and backing the independent audio community!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
