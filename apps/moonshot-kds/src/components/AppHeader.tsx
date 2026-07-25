import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type AppHeaderProps = {
  cafeName: string;
  cafeSlug: string;
  username: string;
  recalling?: boolean;
  onRecall: () => void;
  onLogout: () => void;
};

export function AppHeader({
  cafeName,
  cafeSlug,
  username,
  recalling = false,
  onRecall,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-lg font-semibold tracking-wide">Moonshot KDS</h1>
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {cafeName} ({cafeSlug}) — {username}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Recall last order"
                disabled={recalling}
                onClick={onRecall}
              />
            }
          >
            <Undo2 />
          </TooltipTrigger>
          <TooltipContent>Recall last order</TooltipContent>
        </Tooltip>
        <Button type="button" variant="outline" size="sm" onClick={onLogout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
