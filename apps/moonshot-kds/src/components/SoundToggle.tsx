import { Volume2, VolumeX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { KdsAudioPlayerState } from '../hooks/useKdsAudio.js';

type SoundToggleProps = {
  status: KdsAudioPlayerState;
  muted: boolean;
  cafeEnabled: boolean;
  onClick: () => void;
};

export function SoundToggle({ status, muted, cafeEnabled, onClick }: SoundToggleProps) {
  if (status === 'unsupported') return null;

  const locked = status === 'locked';
  const silent = muted || !cafeEnabled || locked;
  const label = locked
    ? 'Enable board sound'
    : muted
      ? 'Unmute board sound'
      : 'Mute board sound';
  const badge = locked && !muted && cafeEnabled ? 'Tap to enable sound' : silent ? 'Sound off' : null;

  return (
    <div className="flex items-center gap-2">
      {badge ? (
        <Badge variant="warning" className="h-auto min-h-10 px-3">
          {badge}
        </Badge>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="default"
        className="min-h-10"
        aria-label={label}
        aria-pressed={!silent}
        onClick={onClick}
      >
        {silent ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        {locked ? 'Enable sound' : muted ? 'Unmute' : 'Mute'}
      </Button>
    </div>
  );
}
