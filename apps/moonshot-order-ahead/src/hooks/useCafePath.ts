import { useParams } from 'react-router-dom';
import { getCafeSlug } from '../lib/api.js';

export function useCafeSlugFromRoute(): string {
  const { cafeSlug } = useParams<{ cafeSlug: string }>();
  return cafeSlug ?? getCafeSlug();
}

/** Prefix an app-relative path with the current café slug segment. */
export function useCafePath(): (path: string) => string {
  const slug = useCafeSlugFromRoute();
  return (path: string) => {
    if (path === '/') return `/${slug}`;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `/${slug}${normalized}`;
  };
}
