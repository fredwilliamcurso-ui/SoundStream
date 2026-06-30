import React, { useState } from "react";
import { 
  X, 
  Copy, 
  Check, 
  Twitter, 
  Facebook, 
  Instagram, 
  Share2, 
  Sparkles,
  Link2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "song" | "artist";
  id: string;
  title: string;
  subtitle: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  type,
  id,
  title,
  subtitle
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [instagramCopied, setInstagramCopied] = useState(false);

  if (!isOpen) return null;

  // Build the deep link URL based on the current domain
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = `${baseUrl}?${type}=${id}`;

  const twitterShareText = type === "song"
    ? `Deep in the independent flow! Listening to "${title}" by ${subtitle} on SoundStream. Join the indie wave: ${shareUrl} 🎧 #SoundStream #indie`
    : `Supporting label-free talent! Check out independent creator "${title}" on SoundStream: ${shareUrl} ⚡ #SoundStream #indie`;

  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterShareText)}`;

  const instagramCaption = type === "song"
    ? `Streaming "${title}" by ${subtitle} on SoundStream! Check the link in my bio to hear independence: ${shareUrl} 🎵 #SoundStream #IndieMusic #SupportIndie`
    : `Discovered an incredible independent flow from creator "${title}" on SoundStream! Check out their catalog: ${shareUrl} 🔥 #SoundStream #AestheticBeats #VerifiedCreator`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyInstagramCaption = () => {
    navigator.clipboard.writeText(instagramCaption).then(() => {
      setInstagramCopied(true);
      setTimeout(() => setInstagramCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      <div 
        id="share-modal-overlay"
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div 
          id="share-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#0b0b11] border border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-md relative text-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle Ambient Background */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-650/20 rounded-full filter blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none" />

          {/* Close Trigger */}
          <button 
            id="close-share-modal"
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs font-bold"
          >
            ✕
          </button>

          {/* Header */}
          <div className="space-y-2 mb-6">
            <span className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[9px] font-mono tracking-widest text-indigo-400 font-bold uppercase inline-flex items-center gap-1">
              <Share2 className="w-3 h-3" />
              Decentralized Share Hub
            </span>
            <h3 className="font-sans font-black text-xl text-zinc-100 uppercase tracking-tight">
              Share the Independent Vibe
            </h3>
            <p className="text-zinc-450 text-xs font-sans">
              Help amplify sound waves by sharing this {type} across public streaming networks.
            </p>
          </div>

          {/* Preview Card */}
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-indigo-900/40 flex items-center justify-center text-indigo-450 shrink-0 border border-indigo-550/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold uppercase text-zinc-400 font-mono tracking-wider">
                {type === "song" ? "TRACK TARGET" : "CREATOR SPOTLIGHT"}
              </p>
              <h4 id="share-target-title" className="font-sans font-extrabold text-sm text-zinc-100 truncate uppercase mt-0.5">
                {title}
              </h4>
              <p id="share-target-subtitle" className="font-mono text-[10px] text-zinc-500 truncate">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Share Links Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Twitter */}
            <a 
              id="share-twitter-btn"
              href={twitterShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] border border-white/5 hover:border-[#1DA1F2]/20 rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 group transition-all"
            >
              <Twitter className="w-5 h-5 text-zinc-455 group-hover:scale-110 transition-transform" />
              <span className="font-sans font-bold text-xs select-none">Twitter / X</span>
            </a>

            {/* Facebook */}
            <a 
              id="share-facebook-btn"
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/5 hover:bg-[#1877F2]/10 hover:text-[#1877F2] border border-white/5 hover:border-[#1877F2]/20 rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 group transition-all"
            >
              <Facebook className="w-5 h-5 text-zinc-455 group-hover:scale-110 transition-transform" />
              <span className="font-sans font-bold text-xs select-none">Facebook</span>
            </a>
          </div>

          {/* Instagram copy guide */}
          <div className="mb-6 bg-white/5 border border-white/5 p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-pink-400 flex items-center gap-1">
                <Instagram className="w-3.5 h-3.5" />
                Instagram Story Caption
              </span>
              <button 
                id="copy-instagram-btn"
                onClick={copyInstagramCaption}
                className="text-[9.5px] font-mono font-bold text-indigo-405 hover:text-white flex items-center gap-1 transition-colors"
              >
                {instagramCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Caption</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-zinc-400 italic leading-relaxed line-clamp-2">
              "{instagramCaption}"
            </p>
          </div>

          {/* Direct Link Copier */}
          <div className="space-y-1.5">
            <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">
              Direct SoundStream URL
            </span>
            <div className="flex bg-[#050508] border border-white/10 rounded-xl p-1.5 items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 overflow-hidden px-2 py-1 flex-1">
                <Link2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span id="share-clipboard-url" className="text-[10px] font-mono text-zinc-450 truncate select-all">
                  {shareUrl}
                </span>
              </div>
              <button 
                id="copy-direct-url-btn"
                onClick={copyToClipboard}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg font-bold text-xs cursor-pointer tracking-wider uppercase transition-all shrink-0 ${
                  copied 
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" 
                    : "bg-indigo-650 hover:bg-indigo-600 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
