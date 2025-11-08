'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useLocalStorage } from '@/lib/hooks';
import { useTheme } from '@/components/theme-provider';
import {
  Github,
  Network,
  Settings as SettingsIcon,
  Moon,
  Sun,
} from 'lucide-react';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SettingsProps {
  isFetching: boolean;
  setIsFetching: (isFetching: boolean) => void;
  variant?: 'floating' | 'toolbar';
  className?: string;
}

export function Settings({
  isFetching: _isFetching,
  setIsFetching,
  variant = 'floating',
  className,
}: SettingsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { supabaseApiKey, setSupabaseApiKey, setTables, autoArrange } =
    useStore();
  const [url, setUrl] = useState(supabaseApiKey.url);
  const [anon, setAnon] = useState(supabaseApiKey.anon);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [, setDefinitions] = useLocalStorage<any>('definitions', {});
  const { setTheme, isDark } = useTheme();

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  // Update local state when store changes
  useEffect(() => {
    setUrl(supabaseApiKey.url);
    setAnon(supabaseApiKey.anon);
  }, [supabaseApiKey]);

  const fetchData = async () => {
    if (!url || !anon) return;

    setIsFetching(true);
    setError('');

    try {
      const res = await fetch(`${url}/rest/v1/?apikey=${anon}`);

      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (
          contentType &&
          contentType.indexOf('application/openapi+json') !== -1
        ) {
          const data = await res.json();
          if (data.definitions) {
            setDefinitions(data.definitions);

            // Update the store with new API key
            const newApiKey = { url, anon, last_url: supabaseApiKey.last_url };

            if (supabaseApiKey.last_url !== url) {
              // Clear tables if URL changed
              setSupabaseApiKey({ ...newApiKey, last_url: url });
              setTables(data.definitions, data.paths);
              setTimeout(() => {
                autoArrange();
              }, 0);
            } else {
              setSupabaseApiKey(newApiKey);
              setTables(data.definitions, data.paths);
            }
            setOpen(false);
          }
        } else {
          setError('Invalid link');
        }
      } else {
        setError('Error with fetching data');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsFetching(false);
    }
  };

  const isToolbarVariant = variant === 'toolbar';

  const containerClasses = cn(
    isToolbarVariant
      ? 'flex flex-col gap-2'
      : 'fixed right-5 top-5 z-50 flex flex-col gap-2',
    'pointer-events-auto',
    className
  );

  return (
    <>
      <div className={containerClasses}>
        <Button
          variant="outline"
          size="icon"
          title="Schema"
          onClick={() => router.push('/')}
          className={
            pathname === '/' ? 'bg-primary text-primary-foreground' : ''
          }
        >
          <Network size={20} />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" title="Settings">
              <SettingsIcon size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <div className="w-full flex justify-center mb-4">
                <Image
                  src="/logo.svg"
                  width={128}
                  height={128}
                  alt="Supabase Schema Logo"
                />
              </div>
              <SheetTitle className="text-3xl font-bold bg-gradient-to-r from-green-500 to-green-400 bg-clip-text text-transparent">
                Supabase Schema
              </SheetTitle>
              <SheetDescription>Open Source • LocalStorage</SheetDescription>
            </SheetHeader>

            <div className="flex items-center justify-center gap-4 mt-2">
              <a
                href="https://github.com/zernonia/supabase-schema"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github size={20} />
              </a>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <h3 className="font-semibold text-sm uppercase mb-2">Steps</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>
                    Obtain OpenAPI URL following instruction{' '}
                    <a
                      className="underline hover:text-primary"
                      target="_blank"
                      href="https://github.com/zernonia/supabase-schema#-instructions"
                      rel="noreferrer"
                    >
                      here
                    </a>
                  </li>
                  <li>Paste the URL below</li>
                  <li>Enjoy the Supabase Schema</li>
                </ol>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchData();
                }}
              >
                <div className="space-y-2">
                  <label htmlFor="url" className="text-sm font-medium">
                    URL
                  </label>
                  <Input
                    id="url"
                    type="text"
                    name="url"
                    placeholder="https://your-project.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="anon" className="text-sm font-medium">
                    API KEY
                  </label>
                  <Input
                    id="anon"
                    type="text"
                    name="anon"
                    placeholder="your-anon-key"
                    value={anon}
                    onChange={(e) => setAnon(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Fetch Schema
                </Button>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            </div>
          </SheetContent>
        </Sheet>

        <Button
          variant="outline"
          size="icon"
          title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          onClick={toggleTheme}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </Button>
      </div>
    </>
  );
}
