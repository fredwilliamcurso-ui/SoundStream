import React from "react";
import SoundStreamCreatorStudio from "./SoundStreamCreatorStudio";

interface SoundStreamCreatorHubProps {
  creatorId: string;
}

export default function SoundStreamCreatorHub({ creatorId }: SoundStreamCreatorHubProps) {
  return <SoundStreamCreatorStudio creatorId={creatorId} />;
}
