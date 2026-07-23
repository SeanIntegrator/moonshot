import { Button } from '@/components/ui/button';

type AppHeaderProps = {
  cafeName: string;
  cafeSlug: string;
  username: string;
  onLogout: () => void;
};

export function AppHeader({ cafeName, cafeSlug, username, onLogout }: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-wide">Moonshot KDS</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {cafeName} ({cafeSlug}) — {username}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={onLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
