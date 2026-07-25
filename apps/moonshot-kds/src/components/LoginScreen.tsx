import type { FormEvent } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type LoginFormState = {
  cafeSlug: string;
  username: string;
  password: string;
};

type LoginScreenProps = {
  form: LoginFormState;
  error: string | null;
  onChange: (next: LoginFormState) => void;
  onSubmit: (e: FormEvent) => void;
};

export function LoginScreen({ form, error, onChange, onSubmit }: LoginScreenProps) {
  return (
    <div className="flex min-h-full items-start justify-center p-4 pt-12 sm:pt-20">
      <Card className="w-full max-w-sm" size="sm">
        <CardHeader>
          <CardTitle className="text-lg">Moonshot KDS</CardTitle>
          <CardDescription>Sign in with your café slug and KDS credentials.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <form className="flex flex-col gap-3.5" onSubmit={(e) => void onSubmit(e)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kds-cafe-slug">Café slug</Label>
              <Input
                id="kds-cafe-slug"
                autoComplete="username"
                value={form.cafeSlug}
                onChange={(e) => onChange({ ...form, cafeSlug: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kds-username">KDS username</Label>
              <Input
                id="kds-username"
                autoComplete="username"
                value={form.username}
                onChange={(e) => onChange({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kds-password">Password</Label>
              <Input
                id="kds-password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => onChange({ ...form, password: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
