import { History } from 'lucide-react';
import type { RealtimeStatus } from '@moonshot/web-runtime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { KdsAudioPlayerState } from '../hooks/useKdsAudio.js';
import { SoundToggle } from './SoundToggle.js';

type AppHeaderProps = {
  cafeName: string;
  cafeSlug: string;
  username: string;
  connection: RealtimeStatus;
  soundStatus: KdsAudioPlayerState;
  soundMuted: boolean;
  cafeSoundEnabled: boolean;
  onSoundClick: () => void;
  onOpenRecentOrders: () => void;
  onLogout: () => void;
};

function ConnectionBadge({ status }: { status: RealtimeStatus }) {
  if (status === 'connected' || status === 'idle' || status === 'connecting') {
    return null;
  }
  if (status === 'reconnecting') {
    return (
      <Badge variant="warning" className="h-auto min-h-10 px-3">
        Reconnecting…
      </Badge>
    );
  }
  if (status === 'unauthorized') {
    return (
      <Badge variant="destructive" className="h-auto min-h-10 px-3">
        Session expired
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="h-auto min-h-10 px-3">
      Offline — retrying
    </Badge>
  );
}

export function AppHeader({
  cafeName,
  cafeSlug: _cafeSlug,
  username: _username,
  connection,
  soundStatus,
  soundMuted,
  cafeSoundEnabled,
  onSoundClick,
  onOpenRecentOrders,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-wide">Moonshot KDS</h1>
        <p className="truncate text-sm text-muted-foreground">Logged in as {cafeName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <ConnectionBadge status={connection} />
        <SoundToggle
          status={soundStatus}
          muted={soundMuted}
          cafeEnabled={cafeSoundEnabled}
          onClick={onSoundClick}
        />
        <Button
          type="button"
          variant="outline"
          size="default"
          className="min-h-10"
          onClick={onOpenRecentOrders}
        >
          <History className="size-4" />
          Recent orders
        </Button>
        <Button type="button" variant="outline" size="default" className="min-h-10" onClick={onLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
