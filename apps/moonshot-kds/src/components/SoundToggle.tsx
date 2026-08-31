import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

  return (
    <Button
      type="button"
      variant={silent ? 'ghost' : 'outline'}
      size="default"
      className={cn(
        'min-h-10',
        silent &&
          'border-warning/30 bg-warning/15 text-warning-foreground hover:bg-warning/25 dark:bg-warning/25 dark:hover:bg-warning/35',
      )}
      aria-label={label}
      aria-pressed={!silent}
      onClick={onClick}
    >
      {silent ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      {locked ? 'Enable sound' : muted ? 'Unmute' : 'Mute'}
    </Button>
  );
}
