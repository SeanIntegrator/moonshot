import { History } from 'lucide-react';
import type { RealtimeStatus } from '@moonshot/web-runtime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type AppHeaderProps = {
  cafeName: string;
  cafeSlug: string;
  username: string;
  connection: RealtimeStatus;
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
  onOpenRecentOrders,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-wide">Moonshot KDS</h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <ConnectionBadge status={connection} />
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Logged in as {cafeName}
        </span>
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
