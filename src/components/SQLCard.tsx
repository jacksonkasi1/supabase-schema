'use client';

import { SQLCardItem } from '@/lib/types';
import { useClipboard } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import { Clipboard, Link, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
// @ts-ignore - No type definitions available
import sql from 'highlight.js/lib/languages/sql';
import 'highlight.js/styles/dark.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

hljs.registerLanguage('sql', sql);

interface SQLCardProps {
  item: SQLCardItem;
  onDelete: () => void;
}

export function SQLCard({ item, onDelete }: SQLCardProps) {
  const { copy, copied } = useClipboard();
  const { supabaseApiKey } = useStore();

  const copyAndOpenSQLTab = async () => {
    if (!item.result) return;
    await copy(item.result);
    try {
      const projectRef = new URL(supabaseApiKey.url).hostname.split('.')[0];
      window.open(`https://app.supabase.com/project/${projectRef}/sql`, '_blank');
    } catch (error) {
      console.error('Failed to open SQL tab:', error);
    }
  };

  const highlightedCode = useMemo(() => {
    if (!item.result) return '';
    return hljs.highlight(item.result, { language: 'sql' }).value;
  }, [item.result]);

  return (
    <Card className="md:max-w-[36rem] hover:bg-accent/50 transition">
      <CardContent className="p-6 space-y-4">
        <p className="text-foreground">{item.query}</p>
        <pre
          className="text-sm p-4 whitespace-pre-wrap bg-muted rounded-lg border"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title={copied ? 'Copied' : 'Copy'}
              disabled={!item.result}
              onClick={() => copy(item.result ?? '')}
            >
              <Clipboard size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Open SQL Editor"
              disabled={!item.result}
              onClick={copyAndOpenSQLTab}
            >
              <Link size={18} />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            title="Remove"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 size={18} />
          </Button>
        </div>

        <style jsx global>{`
          .hljs-keyword,
          .hljs-link,
          .hljs-literal,
          .hljs-section,
          .hljs-selector-tag {
            @apply text-foreground;
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
