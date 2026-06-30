import { MenuManager } from './menu/MenuManager.js';

type Props = {
  cafeSlug: string;
  token: string;
};

/** @deprecated Use MenuManager — thin wrapper for dashboard compatibility */
export function MenuEditorCard({ cafeSlug, token }: Props) {
  return <MenuManager cafeSlug={cafeSlug} token={token} />;
}
