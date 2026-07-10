import React, { useState, useRef } from "react";
import { Song, Artist } from "../types";
import { 
  Upload, 
  FileAudio, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Loader2, 
  Play, 
  Plus, 
  RefreshCw, 
  Info,
  ChevronRight,
  Database,
  Trash2
} from "lucide-react";
import { motion } from "motion/react";
import { db, uploadToStorage } from "../lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface BulkImportToolProps {
  existingArtists: Artist[];
  onImportComplete?: () => void;
}

interface CSVRow {
  title: string;
  artist: string;
  genre: string;
  releaseDate: string;
  coverImageName: string;
  audioFileName: string;
}

interface ImportStatus {
  index: number;
  row: CSVRow;
  status: "pending" | "uploading_audio" | "uploading_cover" | "saving" | "completed" | "failed";
  error?: string;
  audioUrl?: string;
  coverUrl?: string;
}

export default function BulkImportTool({ existingArtists, onImportComplete }: BulkImportToolProps) {
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [coverFiles, setCoverFiles] = useState<File[]>([]);
  const [csvContent, setCsvContent] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importStatuses, setImportStatuses] = useState<ImportStatus[]>([]);
  const [importLogs, setImportLogs] = useState<string[]>([]);
  
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Default fallbacks
  const FALLBACK_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3";
  const FALLBACK_COVER = "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop&q=80";

  const VALID_GENRES = ["Afrobeats", "Amapiano", "Gospel", "Hip Hop", "Fuji", "Highlife"];

  // Helper to slugify names
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-");
  };

  // Safe CSV Parsing logic
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    // Find index of standard headers
    const titleIdx = headers.findIndex(h => h.includes("title"));
    const artistIdx = headers.findIndex(h => h.includes("artist"));
    const genreIdx = headers.findIndex(h => h.includes("genre"));
    const dateIdx = headers.findIndex(h => h.includes("date") || h.includes("release"));
    const coverIdx = headers.findIndex(h => h.includes("cover"));
    const audioIdx = headers.findIndex(h => h.includes("audio") || h.includes("mp3"));

    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle commas inside quotes correctly
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
      const parts = matches.map(val => val.replace(/^"|"$/g, "").trim());

      const title = titleIdx !== -1 ? parts[titleIdx] || "" : parts[0] || "";
      const artist = artistIdx !== -1 ? parts[artistIdx] || "" : parts[1] || "";
      const genre = genreIdx !== -1 ? parts[genreIdx] || "" : parts[2] || "";
      const releaseDate = dateIdx !== -1 ? parts[dateIdx] || "" : parts[3] || "";
      const coverImageName = coverIdx !== -1 ? parts[coverIdx] || "" : parts[4] || "";
      const audioFileName = audioIdx !== -1 ? parts[audioIdx] || "" : parts[5] || "";

      if (title && artist) {
        rows.push({
          title,
          artist,
          genre,
          releaseDate,
          coverImageName,
          audioFileName
        });
      }
    }

    return rows;
  };

  const handleCsvChange = (text: string) => {
    setCsvContent(text);
    const parsed = parseCSV(text);
    setParsedRows(parsed);
  };

  const handleCsvFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleCsvChange(text);
    };
    reader.readAsText(file);
  };

  const loadCsvTemplate = () => {
    const template = `title,artist,genre,release date,cover image,audio file
Soso,Omah Lay,Afrobeats,2023-11-20,omah_lay_soso.jpg,soso.mp3
Last Last,Burna Boy,Afrobeats,2022-07-08,burna_last.jpg,lastlast.mp3
Amapiano Beat,Asake,Amapiano,2023-06-15,asake_cover.png,amapiano_beat.mp3
Joyful Sound,Sinach,Gospel,2025-01-01,,joyful.mp3`;
    handleCsvChange(template);
  };

  const handleAudioFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setAudioFiles(prev => [...prev, ...selected]);
    }
  };

  const handleCoverFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setCoverFiles(prev => [...prev, ...selected]);
    }
  };

  const removeAudioFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeCoverFile = (index: number) => {
    setCoverFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setAudioFiles([]);
    setCoverFiles([]);
    setCsvContent("");
    setParsedRows([]);
    setImportStatuses([]);
    setImportLogs([]);
  };

  const logMsg = (msg: string) => {
    setImportLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  // Run the full bulk import
  const startImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportLogs([]);
    logMsg(`Starting Bulk Import for ${parsedRows.length} catalog track entries...`);

    const initialStatuses: ImportStatus[] = parsedRows.map((row, index) => ({
      index,
      row,
      status: "pending"
    }));
    setImportStatuses(initialStatuses);

    // Keep track of created artists during this run to avoid duplicates
    const localCreatedArtists = new Map<string, string>(); // artistName -> artistId

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const normalizedArtistName = row.artist.trim();
      logMsg(`[Track ${i + 1}/${parsedRows.length}] Processing "${row.title}" by "${normalizedArtistName}"...`);

      try {
        // Update track status
        setImportStatuses(prev => prev.map((item, idx) => idx === i ? { ...item, status: "uploading_audio" } : item));

        // 1. Locate and upload the audio file
        let audioUrl = FALLBACK_AUDIO;
        if (row.audioFileName) {
          // Check if field itself is a valid direct link
          if (row.audioFileName.startsWith("http://") || row.audioFileName.startsWith("https://")) {
            audioUrl = row.audioFileName;
            logMsg(`Found direct audio url link: ${audioUrl}`);
          } else {
            const matchedFile = audioFiles.find(f => f.name === row.audioFileName);
            if (matchedFile) {
              logMsg(`Uploading audio binary: ${matchedFile.name} (${(matchedFile.size / (1024 * 1024)).toFixed(2)} MB)...`);
              audioUrl = await uploadToStorage(matchedFile, "audio");
              logMsg(`Audio uploaded successfully! Public link: ${audioUrl}`);
            } else {
              logMsg(`No local file matched "${row.audioFileName}". Applying high-fidelity fallback stream.`);
            }
          }
        }

        // Update track status
        setImportStatuses(prev => prev.map((item, idx) => idx === i ? { ...item, status: "uploading_cover", audioUrl } : item));

        // 2. Locate and upload the cover artwork
        let coverUrl = FALLBACK_COVER;
        if (row.coverImageName) {
          if (row.coverImageName.startsWith("http://") || row.coverImageName.startsWith("https://")) {
            coverUrl = row.coverImageName;
            logMsg(`Found direct cover image url link: ${coverUrl}`);
          } else {
            const matchedFile = coverFiles.find(f => f.name === row.coverImageName);
            if (matchedFile) {
              logMsg(`Uploading cover artwork binary: ${matchedFile.name}...`);
              coverUrl = await uploadToStorage(matchedFile, "covers");
              logMsg(`Cover uploaded successfully! Public link: ${coverUrl}`);
            } else {
              logMsg(`No local artwork matched "${row.coverImageName}". Applying default design cover.`);
            }
          }
        }

        // Update track status
        setImportStatuses(prev => prev.map((item, idx) => idx === i ? { ...item, status: "saving", coverUrl } : item));

        // 3. Find or Create Artist Profile
        let artistId = "";
        const existing = existingArtists.find(a => a.artistName.toLowerCase() === normalizedArtistName.toLowerCase());
        const newlyCreatedId = localCreatedArtists.get(normalizedArtistName.toLowerCase());

        if (existing) {
          artistId = existing.userId;
          logMsg(`Matched existing verified artist profile: "${existing.artistName}" with ID ${artistId}`);
        } else if (newlyCreatedId) {
          artistId = newlyCreatedId;
          logMsg(`Matched newly created artist profile in current run: "${normalizedArtistName}" with ID ${artistId}`);
        } else {
          // Create new artist profile automatically!
          artistId = `artist-${slugify(normalizedArtistName)}-${Date.now()}`;
          logMsg(`Creating verified artist profile for "${normalizedArtistName}" (ID: ${artistId})...`);
          
          const newArtist: Artist = {
            uid: artistId,
            userId: artistId,
            artistName: normalizedArtistName,
            bio: `${normalizedArtistName} is an independent SoundStream verified creator.`,
            verified: true, // bulk import creates verified artists as specified by the logs/context
            profilePhoto: `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&q=80`,
            followersCount: Math.floor(Math.random() * 450) + 50,
            createdAt: new Date().toISOString()
          };

          await setDoc(doc(db, "artists", artistId), {
            uid: newArtist.uid || "",
            artistName: newArtist.artistName || "",
            bio: newArtist.bio || "",
            verified: !!newArtist.verified,
            profilePhoto: newArtist.profilePhoto || "",
            followersCount: newArtist.followersCount || 0,
            createdAt: newArtist.createdAt || new Date().toISOString()
          });
          localCreatedArtists.set(normalizedArtistName.toLowerCase(), artistId);
          logMsg(`Created artist profile successfully!`);
        }

        // 4. Clean and normalize genre
        let finalGenre = "Afrobeats";
        const matchedGenre = VALID_GENRES.find(g => g.toLowerCase() === row.genre.trim().toLowerCase());
        if (matchedGenre) {
          finalGenre = matchedGenre;
        } else if (row.genre) {
          // Titlecase whatever is there
          finalGenre = row.genre.trim().charAt(0).toUpperCase() + row.genre.trim().slice(1);
        }

        // 5. Create the song record
        const songId = `song-${slugify(row.title)}-${Date.now()}`;
        logMsg(`Writing song document to Firestore (ID: ${songId})...`);

        const newSong: Song = {
          id: songId,
          artistId: artistId || "",
          artistName: normalizedArtistName || "",
          title: row.title || "",
          genre: finalGenre || "",
          coverUrl: coverUrl || "",
          audioUrl: audioUrl || "",
          videoUrl: "",
          playCount: Math.floor(Math.random() * 1200) + 180,
          likes: Math.floor(Math.random() * 95),
          createdAt: row.releaseDate ? new Date(row.releaseDate).toISOString() : new Date().toISOString(),
          type: "song",
          lyrics: `[Verse 1]\nImported via bulk CSV automation.\nEnjoy the premium independent vibes of ${normalizedArtistName} on SoundStream!`
        };

        await setDoc(doc(db, "songs", songId), newSong);
        logMsg(`[Success] Saved "${row.title}" record successfully!`);

        // Update track status
        setImportStatuses(prev => prev.map((item, idx) => idx === i ? { ...item, status: "completed" } : item));

      } catch (err: any) {
        const errorMsg = err?.message || "Unknown error";
        logMsg(`[Error] Failed to import track: ${errorMsg}`);
        setImportStatuses(prev => prev.map((item, idx) => idx === i ? { ...item, status: "failed", error: errorMsg } : item));
      }
    }

    setIsImporting(false);
    logMsg("Bulk Import pipeline execution completed!");
    if (onImportComplete) {
      onImportComplete();
    }
  };

  // Check matching files helpers
  const isAudioMatched = (filename: string) => {
    if (!filename) return false;
    if (filename.startsWith("http://") || filename.startsWith("https://")) return true;
    return audioFiles.some(f => f.name === filename);
  };

  const isCoverMatched = (filename: string) => {
    if (!filename) return false;
    if (filename.startsWith("http://") || filename.startsWith("https://")) return true;
    return coverFiles.some(f => f.name === filename);
  };

  return (
    <div id="bulk-import-container" className="space-y-8 bg-[#040406]/90 border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/25 rounded-full text-[9px] font-bold tracking-widest text-indigo-300 uppercase font-mono mb-2">
            <Database className="w-3 h-3 text-indigo-400" />
            AUTOMATION CONTROL PANEL
          </span>
          <h3 className="text-xl font-bold tracking-tight text-white uppercase tracking-tight">
            Bulk Catalog CSV Importer
          </h3>
          <p className="text-zinc-400 text-xs mt-1">
            Simultaneously ingest multiple audio files, visual covers, and a metadata manifest sheet into Firestore.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadCsvTemplate}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-semibold font-sans border border-indigo-500/15 transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Load Sample CSV Template
          </button>
          <button
            type="button"
            onClick={clearAllFiles}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 text-xs font-semibold font-sans border border-white/5 hover:border-red-500/20 transition-colors flex items-center gap-1.5"
            disabled={isImporting}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Grid of upload triggers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Dropzone 1: CSV Metadata */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono flex items-center gap-1.5">
            1. Metadata CSV Sheet
          </label>
          <div 
            onClick={() => csvFileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-indigo-500/55 rounded-2xl p-5 text-center cursor-pointer bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center min-h-[130px] group"
          >
            <input 
              ref={csvFileInputRef}
              type="file" 
              accept=".csv"
              onChange={handleCsvFileLoad}
              className="hidden" 
            />
            <FileSpreadsheet className="w-8 h-8 text-indigo-400/70 group-hover:text-indigo-400 mb-2 transition-colors" />
            <p className="text-xs font-semibold text-zinc-200">Load CSV Manifest</p>
            <p className="text-[9.5px] text-zinc-500 mt-1">Accepts UTF-8 .csv files</p>
          </div>
        </div>

        {/* Dropzone 2: MP3 Files */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono flex items-center gap-1.5">
            2. Local MP3 Tracks ({audioFiles.length})
          </label>
          <div 
            onClick={() => audioFileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-indigo-500/55 rounded-2xl p-5 text-center cursor-pointer bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center min-h-[130px] group"
          >
            <input 
              ref={audioFileInputRef}
              type="file" 
              multiple
              accept="audio/*"
              onChange={handleAudioFilesSelect}
              className="hidden" 
            />
            <FileAudio className="w-8 h-8 text-indigo-400/70 group-hover:text-indigo-400 mb-2 transition-colors animate-pulse" />
            <p className="text-xs font-semibold text-zinc-200">Upload MP3 Files</p>
            <p className="text-[9.5px] text-zinc-500 mt-1">Select multiple files at once</p>
          </div>
        </div>

        {/* Dropzone 3: Cover Artworks */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono flex items-center gap-1.5">
            3. Local Cover Artworks ({coverFiles.length})
          </label>
          <div 
            onClick={() => coverFileInputRef.current?.click()}
            className="border-2 border-dashed border-white/10 hover:border-indigo-500/55 rounded-2xl p-5 text-center cursor-pointer bg-white/2 hover:bg-white/5 transition-all flex flex-col items-center justify-center min-h-[130px] group"
          >
            <input 
              ref={coverFileInputRef}
              type="file" 
              multiple
              accept="image/*"
              onChange={handleCoverFilesSelect}
              className="hidden" 
            />
            <ImageIcon className="w-8 h-8 text-indigo-400/70 group-hover:text-indigo-400 mb-2 transition-colors" />
            <p className="text-xs font-semibold text-zinc-200">Upload Artwork Files</p>
            <p className="text-[9.5px] text-zinc-500 mt-1">JPEG/PNG graphic format</p>
          </div>
        </div>

      </div>

      {/* Manual CSV Content paste / Edit */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono">
            Interactive CSV Metadata Manifest Textarea
          </label>
          {parsedRows.length > 0 && (
            <span className="text-[10.5px] font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-full">
              {parsedRows.length} potential tracks found
            </span>
          )}
        </div>
        <textarea
          rows={5}
          value={csvContent}
          onChange={(e) => handleCsvChange(e.target.value)}
          placeholder={`title,artist,genre,release date,cover image,audio file\nTrack Name,Artist Name,Afrobeats,2026-02-15,cover_image.jpg,track_song.mp3`}
          className="w-full bg-zinc-950/75 border border-white/5 rounded-2xl p-4 font-mono text-xs text-indigo-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500 leading-relaxed"
          disabled={isImporting}
        />
      </div>

      {/* Lists of Uploaded physical assets */}
      {(audioFiles.length > 0 || coverFiles.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/40 p-5 rounded-2xl border border-white/5">
          {/* Audio queue */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <FileAudio className="w-3.5 h-3.5 text-indigo-400" />
              Ingested Audio Files ({audioFiles.length})
            </h4>
            <div className="max-h-[150px] overflow-y-auto space-y-1 pr-1">
              {audioFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/2 rounded-lg border border-white/5 text-[11px] font-mono">
                  <span className="text-zinc-200 truncate max-w-[80%]">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-[10px]">{(file.size / (1024 * 1024)).toFixed(1)}MB</span>
                    <button 
                      onClick={() => removeAudioFile(idx)} 
                      className="text-red-400 hover:text-red-300 hover:bg-white/5 p-1 rounded transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cover queue */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              Ingested Artwork Files ({coverFiles.length})
            </h4>
            <div className="max-h-[150px] overflow-y-auto space-y-1 pr-1">
              {coverFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-white/2 rounded-lg border border-white/5 text-[11px] font-mono">
                  <span className="text-zinc-200 truncate max-w-[80%]">{file.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-[10px]">{(file.size / 1024).toFixed(0)}KB</span>
                    <button 
                      onClick={() => removeCoverFile(idx)} 
                      className="text-red-400 hover:text-red-300 hover:bg-white/5 p-1 rounded transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CSV Preview Table */}
      {parsedRows.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
            Execution Roadmap & Preview Matrix
          </h4>
          <div className="overflow-x-auto rounded-2xl border border-white/5">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-zinc-400 font-mono text-[10px] uppercase">
                  <th className="p-3">Track Info</th>
                  <th className="p-3">Genre</th>
                  <th className="p-3">Release Date</th>
                  <th className="p-3">Audio Source</th>
                  <th className="p-3">Cover Art</th>
                  <th className="p-3 text-right">Preview Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {parsedRows.map((row, idx) => {
                  const hasAudio = isAudioMatched(row.audioFileName);
                  const hasCover = isCoverMatched(row.coverImageName);
                  const activeStatus = importStatuses[idx]?.status;

                  return (
                    <tr key={idx} className="hover:bg-white/2 transition-colors">
                      <td className="p-3">
                        <p className="font-semibold text-zinc-100">{row.title}</p>
                        <p className="text-[10px] text-indigo-400 font-mono">by {row.artist}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-[10px] text-indigo-300 font-semibold font-mono">
                          {row.genre || "Afrobeats"}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400 font-mono text-[10px]">
                        {row.releaseDate || "Immediate"}
                      </td>
                      <td className="p-3">
                        {hasAudio ? (
                          <span className="text-green-400 font-mono text-[10.5px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-green-500" /> Matched local file
                          </span>
                        ) : row.audioFileName?.startsWith("http") ? (
                          <span className="text-indigo-300 font-mono text-[10.5px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-indigo-400" /> Direct URL Link
                          </span>
                        ) : (
                          <span className="text-yellow-450 font-mono text-[10.5px] flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-yellow-500" /> Demo track fallback
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {hasCover ? (
                          <span className="text-green-400 font-mono text-[10.5px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-green-500" /> Matched artwork
                          </span>
                        ) : row.coverImageName?.startsWith("http") ? (
                          <span className="text-indigo-300 font-mono text-[10.5px] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-indigo-400" /> Direct URL Link
                          </span>
                        ) : (
                          <span className="text-yellow-450 font-mono text-[10.5px] flex items-center gap-1">
                            <Info className="w-3.5 h-3.5 text-yellow-500" /> Default design artwork
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {activeStatus === "pending" && <span className="text-zinc-500 font-mono">Staged</span>}
                        {activeStatus === "uploading_audio" && (
                          <span className="text-indigo-400 font-mono flex items-center justify-end gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting Audio
                          </span>
                        )}
                        {activeStatus === "uploading_cover" && (
                          <span className="text-indigo-400 font-mono flex items-center justify-end gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting Cover
                          </span>
                        )}
                        {activeStatus === "saving" && (
                          <span className="text-yellow-500 font-mono flex items-center justify-end gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Writing doc
                          </span>
                        )}
                        {activeStatus === "completed" && (
                          <span className="text-green-400 font-bold font-mono flex items-center justify-end gap-1">
                            <Check className="w-3.5 h-3.5 text-green-400" /> Done
                          </span>
                        )}
                        {activeStatus === "failed" && (
                          <span className="text-red-400 font-mono flex items-center justify-end gap-1" title={importStatuses[idx]?.error}>
                            <AlertCircle className="w-3.5 h-3.5" /> Blocked
                          </span>
                        )}
                        {!activeStatus && <span className="text-indigo-400 font-mono font-bold flex items-center justify-end gap-1">Ready</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Console output display logs */}
      {importLogs.length > 0 && (
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono flex items-center gap-1.5">
            Ingestion Pipeline Console Output Logs
          </label>
          <div className="bg-zinc-950 border border-white/5 rounded-2xl p-4.5 font-mono text-[10.5px] text-green-400/90 max-h-[180px] overflow-y-auto space-y-1 scrollbar-thin select-all">
            {importLogs.map((log, idx) => (
              <p key={idx} className="leading-relaxed break-all">
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Button to activate import action */}
      <button
        id="bulk-import-submit-btn"
        type="button"
        onClick={startImport}
        className="w-full bg-indigo-600 hover:bg-indigo-550 text-white font-extrabold text-xs tracking-widest uppercase py-4 rounded-xl shadow-lg shadow-indigo-650/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        disabled={isImporting || parsedRows.length === 0}
      >
        {isImporting ? (
          <>
            <Loader2 className="w-4.5 h-4.5 animate-spin text-white" />
            Ingesting catalog records in Firestore...
          </>
        ) : (
          <>
            <Database className="w-4.5 h-4.5" />
            Launch Bulk Ingestion Pipeline ({parsedRows.length} Tracks)
          </>
        )}
      </button>
    </div>
  );
}
