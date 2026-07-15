import React, { useState } from "react";
import { User, Artist } from "../types";
import { Mail, Lock, User as UserIcon, ShieldAlert, CheckCircle, Radio } from "lucide-react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "firebase/auth";
import { doc, setDoc, getDoc, query, collection, where, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { analytics } from "../lib/analytics";
// @ts-ignore
import logoUrl from "../assets/images/soundstream_logo_1782150206757.jpg";

interface LoginViewProps {
  onLoginSuccess: (user: User, createdArtist?: Artist) => void;
  users: User[];
  onBackToHome: () => void;
}

export default function LoginView({ onLoginSuccess, users, onBackToHome }: LoginViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isArtist, setIsArtist] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  // Artist specific fields if they register as artist
  const [artistName, setArtistName] = useState("");
  const [artistBio, setArtistBio] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      // Retrieve profile or create one
      const userDocSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      let matchedUser: User;
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        matchedUser = {
          uid: data.uid || firebaseUser.uid,
          username: data.username || data.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
          email: data.email || firebaseUser.email || "",
          photoURL: data.photoURL || firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
          createdAt: data.createdAt || new Date().toISOString(),
          role: data.role || "listener",
          id: data.uid || firebaseUser.uid,
          displayName: data.username || data.displayName || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User"
        };
      } else {
        const usernameVal = firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User";
        matchedUser = {
          uid: firebaseUser.uid,
          username: usernameVal,
          email: firebaseUser.email || "",
          photoURL: firebaseUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
          createdAt: new Date().toISOString(),
          role: "listener",
          id: firebaseUser.uid,
          displayName: usernameVal
        };
        await setDoc(doc(db, "users", firebaseUser.uid), {
          uid: matchedUser.uid || "",
          username: matchedUser.username || "",
          email: matchedUser.email || "",
          photoURL: matchedUser.photoURL || "",
          createdAt: matchedUser.createdAt || new Date().toISOString(),
          role: matchedUser.role || "listener"
        });
      }

      // Track successful login event
      analytics.trackEvent("login", matchedUser.uid, matchedUser.email, { method: "google" });

      setSuccessMessage(`Welcome, ${matchedUser.username}!`);
      setTimeout(() => {
        onLoginSuccess(matchedUser);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Google Sign-In failed.");
    }
  };

  const handleSoundstreamSignIn = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch("/api/auth/soundstream/url?isArtist=false");
      if (!response.ok) {
        throw new Error("Failed to fetch Soundstream authentication URL.");
      }
      const { url } = await response.json();
      const width = 580;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      const popup = window.open(
        url,
        "soundstream_oauth_popup",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=yes`
      );
      if (!popup) {
        setErrorMessage("Please allow popups for this site to sign in with Soundstream.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Soundstream authorization failed.");
    }
  };

  React.useEffect(() => {
    const handleSoundstreamMessage = async (event: MessageEvent) => {
      if (event.data?.type === "SOUNDSTREAM_AUTH_SUCCESS") {
        const { openId, username, accessToken } = event.data.data;
        setErrorMessage("");
        setSuccessMessage("");
        try {
          const userCredential = await signInAnonymously(auth);
          const firebaseUser = userCredential.user;

          const q = query(collection(db, "users"), where("soundstreamId", "==", openId));
          const querySnapshot = await getDocs(q);
          
          let matchedUser: User;
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const data = userDoc.data();
            matchedUser = {
              uid: data.uid || firebaseUser.uid,
              username: data.username || username,
              email: data.email || `${username}@soundstream.soundstream.com`,
              photoURL: data.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
              createdAt: data.createdAt || new Date().toISOString(),
              role: data.role || "listener",
              id: data.uid || firebaseUser.uid,
              displayName: data.username || username,
              soundstreamId: openId,
              soundstreamUsername: username
            };
          } else {
            matchedUser = {
              uid: firebaseUser.uid,
              username: username,
              email: `${username}@soundstream.soundstream.com`,
              photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
              createdAt: new Date().toISOString(),
              role: "listener",
              id: firebaseUser.uid,
              displayName: username,
              soundstreamId: openId,
              soundstreamUsername: username
            };
            
            await setDoc(doc(db, "users", firebaseUser.uid), {
              uid: matchedUser.uid,
              username: matchedUser.username,
              email: matchedUser.email,
              photoURL: matchedUser.photoURL,
              createdAt: matchedUser.createdAt,
              role: matchedUser.role,
              soundstreamId: openId,
              soundstreamUsername: username,
              soundstreamAccessToken: accessToken
            });
          }

          analytics.trackEvent("login", matchedUser.uid, matchedUser.email, { method: "soundstream" });
          setSuccessMessage(`Welcome, @${username} (via Soundstream)!`);
          setTimeout(() => {
            onLoginSuccess(matchedUser);
          }, 1000);
        } catch (err: any) {
          console.error("Soundstream Login database interaction error:", err);
          setErrorMessage(err.message || "Soundstream account integration failed.");
        }
      }
    };

    window.addEventListener("message", handleSoundstreamMessage);
    return () => window.removeEventListener("message", handleSoundstreamMessage);
  }, [onLoginSuccess]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password) {
      setErrorMessage("Please fill in both email and password fields.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Retrieve profile
      const userDocSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      let matchedUser: User;
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        matchedUser = {
          uid: data.uid || firebaseUser.uid,
          username: data.username || data.displayName || email.split("@")[0],
          email: data.email || email,
          photoURL: data.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
          createdAt: data.createdAt || new Date().toISOString(),
          role: data.role || "listener",
          id: data.uid || firebaseUser.uid,
          displayName: data.username || data.displayName || email.split("@")[0]
        };
      } else {
        const usernameVal = email.split("@")[0];
        const roleVal = (email.includes("artist") || email.includes("neon")) ? "artist" : "listener";
        matchedUser = {
          uid: firebaseUser.uid,
          username: usernameVal,
          email: email,
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80",
          createdAt: new Date().toISOString(),
          role: roleVal,
          id: firebaseUser.uid,
          displayName: usernameVal
        };
        await setDoc(doc(db, "users", firebaseUser.uid), {
          uid: matchedUser.uid || "",
          username: matchedUser.username || "",
          email: matchedUser.email || "",
          photoURL: matchedUser.photoURL || "",
          createdAt: matchedUser.createdAt || new Date().toISOString(),
          role: matchedUser.role || "listener"
        });
      }

      // Track successful login event
      analytics.trackEvent("login", matchedUser.uid, matchedUser.email, { method: "email" });

      setSuccessMessage(`Welcome back, ${matchedUser.username || matchedUser.displayName}!`);
      setTimeout(() => {
        onLoginSuccess(matchedUser);
      }, 1000);
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        // Automatically register to optimize demo/testing UX as people enter temporary accounts
        try {
          const signUpCred = await createUserWithEmailAndPassword(auth, email, password);
          const isUserArtist = email.includes("artist") || email.includes("neon");
          const usernameVal = email.split("@")[0];
          const newUser: User = {
            uid: signUpCred.user.uid,
            username: usernameVal,
            email: email,
            photoURL: isUserArtist
              ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80"
              : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
            createdAt: new Date().toISOString(),
            role: isUserArtist ? "artist" : "listener",
            id: signUpCred.user.uid,
            displayName: usernameVal
          };
          await setDoc(doc(db, "users", signUpCred.user.uid), {
            uid: newUser.uid || "",
            username: newUser.username || "",
            email: newUser.email || "",
            photoURL: newUser.photoURL || "",
            createdAt: newUser.createdAt || new Date().toISOString(),
            role: newUser.role || "listener"
          });
          
          let createdArtist: Artist | undefined = undefined;
          if (isUserArtist) {
            createdArtist = {
              uid: newUser.uid,
              userId: newUser.uid,
              artistName: newUser.username.toUpperCase(),
              bio: "Independent SoundStream music creator.",
              verified: false,
              profilePhoto: newUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
              followersCount: 15,
              createdAt: newUser.createdAt
            };
            await setDoc(doc(db, "artists", newUser.uid), {
              uid: createdArtist.uid || "",
              artistName: createdArtist.artistName || "",
              bio: createdArtist.bio || "",
              verified: !!createdArtist.verified,
              profilePhoto: createdArtist.profilePhoto || "",
              followersCount: createdArtist.followersCount || 0,
              createdAt: createdArtist.createdAt || new Date().toISOString()
            });
          }
          // Track sign up and artist registration
          analytics.trackEvent("signup", newUser.uid, newUser.email, { method: "email_auto", role: newUser.role });
          if (createdArtist) {
            analytics.trackEvent("artist_registration", createdArtist.uid, newUser.email, { artistName: createdArtist.artistName, auto: true });
          }

          setSuccessMessage(`Account created! Thank you for joining SoundStream.`);
          setTimeout(() => {
            onLoginSuccess(newUser, createdArtist);
          }, 1000);
        } catch (signUpErr: any) {
          setErrorMessage(signUpErr.message || "Failed to authenticate.");
        }
      } else {
        setErrorMessage(err.message || "Failed to log in.");
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!email || !password || !username) {
      setErrorMessage("Please complete all general registration fields.");
      return;
    }

    if (isArtist && !artistName) {
      setErrorMessage("Please provide an artist name to publish your profile.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const newUser: User = {
        uid: firebaseUser.uid,
        username: username,
        email: email,
        photoURL: isArtist 
          ? "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80" 
          : "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
        createdAt: new Date().toISOString(),
        role: isArtist ? "artist" : "listener",
        id: firebaseUser.uid,
        displayName: username
      };

      await setDoc(doc(db, "users", firebaseUser.uid), {
        uid: newUser.uid || "",
        username: newUser.username || "",
        email: newUser.email || "",
        photoURL: newUser.photoURL || "",
        createdAt: newUser.createdAt || new Date().toISOString(),
        role: newUser.role || "listener"
      });

      let createdArtist: Artist | undefined = undefined;
      if (isArtist) {
        createdArtist = {
          uid: firebaseUser.uid,
          userId: firebaseUser.uid,
          artistName: artistName,
          bio: artistBio || `Hello, I'm ${artistName}. Independent artist stream owner on SoundStream.`,
          verified: false,
          profilePhoto: newUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
          followersCount: 0,
          createdAt: newUser.createdAt
        };
        await setDoc(doc(db, "artists", firebaseUser.uid), {
          uid: createdArtist.uid || "",
          artistName: createdArtist.artistName || "",
          bio: createdArtist.bio || "",
          verified: !!createdArtist.verified,
          profilePhoto: createdArtist.profilePhoto || "",
          followersCount: createdArtist.followersCount || 0,
          createdAt: createdArtist.createdAt || new Date().toISOString()
        });
      }

      // Track manual sign up and artist registration
      analytics.trackEvent("signup", newUser.uid, newUser.email, { method: "email_manual", role: newUser.role });
      if (createdArtist) {
        analytics.trackEvent("artist_registration", createdArtist.uid, newUser.email, { artistName: createdArtist.artistName, auto: false });
      }

      setSuccessMessage(`Account created! Thank you for joining SoundStream.`);
      setTimeout(() => {
        onLoginSuccess(newUser, createdArtist);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Sign up failed.");
    }
  };

  const autofillUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setIsSignUp(false);
  };


  return (
    <div 
      id="soundstream-login-page"
      className="max-w-md mx-auto my-12 bg-[#050508] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden font-sans text-white"
    >
      {/* Decorative ambient background blur */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-505/10 rounded-full filter blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full filter blur-3xl pointer-events-none" />

      <div className="text-center mb-8 font-sans">
        {!imgError ? (
          <img 
            src={logoUrl} 
            alt="SoundStream Logo" 
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl object-cover shadow-xl shadow-indigo-600/10 border border-white/10"
          />
        ) : (
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-600/10 border border-white/10">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
        )}
        <h2 className="text-2xl font-bold font-sans text-white tracking-tight uppercase">
          {isSignUp ? "Join Independent Wave" : "Access SoundStream"}
        </h2>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-sans">
          {isSignUp 
            ? "Upload your signature sounds, share direct links, and gain real listener traction." 
            : "Connect with real indie vocalists, discover hidden gems, and build your catalog."}
        </p>
      </div>

      {/* Dynamic Alerts */}
      {errorMessage && (
        <div id="login-error-alert" className="mb-5 bg-red-950/30 border border-red-500/20 text-red-300 text-xs rounded-xl p-3.5 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div id="login-success-alert" className="mb-5 bg-indigo-950/35 border border-indigo-500/20 text-indigo-300 text-xs rounded-xl p-3.5 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Forms */}
      <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
        {isSignUp && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                id="login-username-input"
                type="text"
                placeholder="soundmaster_99"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-zinc-100 placeholder-zinc-500 transition-colors"
                required
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              id="login-email-input"
              type="email"
              placeholder="vocalist@stream.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-zinc-100 placeholder-zinc-500 transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
            Security Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              id="login-password-input"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-indigo-500 text-zinc-100 placeholder-zinc-500 transition-colors"
              required
            />
          </div>
        </div>

        {/* Independent Artist Registration Checkbox Options */}
        {isSignUp && (
          <div className="bg-white/5 p-4 border border-white/10 rounded-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="artist-signup-toggle" className="text-xs font-sans font-medium text-white cursor-pointer select-none">
                Register as an Independent Artist
              </label>
              <input 
                id="artist-signup-toggle"
                type="checkbox"
                checked={isArtist}
                onChange={(e) => setIsArtist(e.target.checked)}
                className="w-4.5 h-4.5 accent-indigo-650 cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-zinc-450 font-sans leading-relaxed">
              Activating your Independent Artist account grants immediate access to upload high-fidelity MP3 files, set custom cover arts, tag genres, and review follower analytics.
            </p>

            {isArtist && (
              <div className="space-y-3 pt-2.5 border-t border-white/5 animate-slide-down">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-indigo-400 mb-1">
                    Independent Artist Name / Project
                  </label>
                  <input 
                    id="artist-project-name"
                    type="text"
                    placeholder="e.g. Celestial Wave"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="w-full bg-[#050508] border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-zinc-100 placeholder-zinc-650 transition-colors"
                    required={isArtist}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">
                    Short Bio / Pitch
                  </label>
                  <textarea 
                    id="artist-project-bio"
                    placeholder="Tell listeners about your background, modular synthetics, acoustic style, or vision..."
                    rows={2}
                    value={artistBio}
                    onChange={(e) => setArtistBio(e.target.value)}
                    className="w-full bg-[#050508] border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-indigo-500 text-zinc-105 placeholder-zinc-650 transition-colors resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5 pt-2">
          {isSignUp ? (
            <button 
              id="signup-submit-btn"
              type="submit"
              className="w-full bg-indigo-600 text-white font-extrabold text-xs tracking-wider uppercase py-3 rounded-xl hover:bg-indigo-550 transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              Sign Up
            </button>
          ) : (
            <button 
              id="login-submit-btn"
              type="submit"
              className="w-full bg-indigo-600 text-white font-extrabold text-xs tracking-wider uppercase py-3 rounded-xl hover:bg-indigo-550 transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              Log In
            </button>
          )}

          <div className="flex items-center my-1">
            <div className="flex-1 border-t border-white/5"></div>
            <span className="px-3 text-[10px] uppercase font-mono tracking-wider text-zinc-500">or</span>
            <div className="flex-1 border-t border-white/5"></div>
          </div>

          <button 
            id="google-signin-btn"
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-[#0d0d0f] hover:bg-white/5 text-zinc-200 border border-white/10 font-bold text-xs tracking-wider uppercase py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#ea4335" d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.51 1.7 14.96 1 12 1 7.35 1 3.4 3.65 1.57 7.5l3.8 2.95C6.26 6.94 8.9 5.04 12 5.04z" />
              <path fill="#4285f4" d="M23.45 12.3c0-.82-.07-1.6-.2-2.3H12v4.4h6.43c-.28 1.44-1.1 2.66-2.33 3.47l3.6 2.8c2.1-1.94 3.75-4.8 3.75-8.37z" />
              <path fill="#fbbc05" d="M5.37 14.55c-.24-.72-.37-1.5-.37-2.3s.13-1.58.37-2.3L1.57 7.01C.57 9.01 0 11.23 0 13.5s.57 4.49 1.57 6.49l3.8-2.95c-.24-.49-.24-.98-.24-1.49z" />
              <path fill="#34a853" d="M12 23c3.24 0 5.97-1.07 7.96-2.93l-3.6-2.8c-1.1.74-2.5 1.18-4.36 1.18-3.1 0-5.74-1.9-6.63-4.47l-3.8 2.95C3.4 20.35 7.35 23 12 23z" />
            </svg>
            <span>Sign In with Google</span>
          </button>

          <button 
            id="soundstream-signin-btn"
            type="button"
            onClick={handleSoundstreamSignIn}
            className="w-full bg-black hover:bg-zinc-950 text-white border border-white/10 hover:border-pink-500/50 font-bold text-xs tracking-wider uppercase py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-pink-500/10 hover:shadow-cyan-400/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.19a8.1 8.1 0 0 0 3.93 2.45v3.91c-.88-.08-1.75-.32-2.58-.66a8.04 8.04 0 0 1-3.1-2.28c-.06 2.3-.01 4.59-.02 6.89-.04 1.34-.33 2.7-.93 3.89a7.33 7.33 0 0 1-4.71 4.14c-1.63.49-3.41.48-5.02-.1a7.35 7.35 0 0 1-4.14-4.52c-.52-1.57-.45-3.32.19-4.83a7.32 7.32 0 0 1 4.88-4.27V12.7a3.42 3.42 0 0 0-2.07 1.37 3.44 3.44 0 0 0-.42 3.04 3.42 3.42 0 0 0 2.76 2.3c.96.1 1.95-.15 2.72-.75.83-.65 1.29-1.67 1.28-2.72.03-3.99.01-7.98.02-11.97-.01-.32.03-.64.12-.95.27-1.14.94-2.15 1.88-2.84.44-.31.93-.55 1.45-.69.45-.11.9-.17 1.35-.17Z"/>
            </svg>
            <span>Sign In with Soundstream</span>
          </button>

          <button 
            id="toggle-auth-mode-btn"
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMessage("");
            }}
            className="text-xs text-zinc-400 hover:text-white transition-colors py-1 hover:underline text-center"
          >
            {isSignUp ? "Already have an account? Log In" : "Don't have an account? Sign Up now"}
          </button>
        </div>
      </form>

      {/* Pre-configured Demo Accounts */}
      <div className="mt-8 pt-6 border-t border-white/5">
        <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-2.5 text-center">
          ⚡ Quick Demo Login Slots
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button 
            type="button"
            onClick={() => autofillUser("neon@soundstream.com")}
            className="bg-white/5 hover:bg-white/10 text-zinc-300 py-2.5 px-2.5 rounded-xl text-center font-mono border border-white/10 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span className="text-indigo-400 font-bold text-[10px]">Neon Catalyst</span>
            <span className="text-[9px] text-zinc-500">Artist account</span>
          </button>
          
          <button 
            type="button"
            onClick={() => autofillUser("listener@soundstream.com")}
            className="bg-white/5 hover:bg-white/10 text-zinc-300 py-2.5 px-2.5 rounded-xl text-center font-mono border border-white/10 flex flex-col items-center gap-0.5 transition-colors cursor-pointer"
          >
            <span className="text-pink-400 font-bold text-[10px]">MusicLover99</span>
            <span className="text-[9px] text-zinc-500">Listener account</span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <button 
          type="button" 
          onClick={onBackToHome}
          className="text-xs text-zinc-500 hover:text-indigo-405 transition-colors font-sans hover:underline"
        >
          ← Browse music without logging in
        </button>
      </div>
    </div>
  );
}
