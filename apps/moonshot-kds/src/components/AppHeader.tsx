import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AppHeaderProps = {
  cafeName: string;
  cafeSlug: string;
  username: string;
  onOpenRecentOrders: () => void;
  onLogout: () => void;
};

export function AppHeader({
  cafeName,
  cafeSlug,
  username,
  onOpenRecentOrders,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-wide">Moonshot KDS</h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {cafeName}
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
