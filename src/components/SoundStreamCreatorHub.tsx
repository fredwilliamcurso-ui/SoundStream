import React from "react";
import SoundStreamCreatorStudio from "./SoundStreamCreatorStudio";

interface SoundStreamCreatorHubProps {
  creatorId: string;
  onNavigateToUpload?: () => void;
}

export default function SoundStreamCreatorHub({ creatorId, onNavigateToUpload }: SoundStreamCreatorHubProps) {
  return <SoundStreamCreatorStudio creatorId={creatorId} onNavigateToUpload={onNavigateToUpload} />;
}
