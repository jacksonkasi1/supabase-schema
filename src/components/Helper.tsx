'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useClipboard } from '@/lib/hooks';
import { toPng } from 'html-to-image';
import {
  Share2,
  FileType,
  Database,
  Camera,
  Sparkles,
  Target
} from 'lucide-react';
import { ModalSQL } from './ModalSQL';
import { ModalTypes } from './ModalTypes';
import { HelperZoom } from './HelperZoom';
import { Button } from '@/components/ui/button';
import AES from 'crypto-js/aes';

export function Helper() {
  const { tables, schemaView, supabaseApiKey, setSchemaView, autoArrange } = useStore();
  const { copy, copied } = useClipboard();
  const [exportSQL, setExportSQL] = useState(false);
  const [exportTypes, setExportTypes] = useState(false);

  const focusView = () => {
    const padding = 100;
    const assumeWidthHeight = 300;
    const allX = Object.values(tables).map((a) => a.position?.x || 0);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX) + assumeWidthHeight;
    const allY = Object.values(tables).map((a) => a.position?.y || 0);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY) + assumeWidthHeight;

    const diffX = maxX - minX + padding * 2;
    const diffY = maxY - minY + padding * 2;
    const scaleX = window.innerWidth / diffX;
    const scaleY = window.innerHeight / diffY;

    const bestScale = Math.min(scaleX, scaleY);

    const centeringX = (window.innerWidth - diffX * bestScale) * bestScale;
    const centeringY = (window.innerHeight - diffY * bestScale) * bestScale;

    const translateX = (-1 * minX + centeringX + padding) * bestScale;
    const translateY = (-1 * minY + centeringY + padding) * bestScale;

    setSchemaView({
      scale: bestScale,
      translate: { x: translateX, y: translateY },
    });
  };

  const handleAutoArrange = () => {
    autoArrange();
    setTimeout(() => {
      focusView();
    }, 0);
  };

  const screenshot = () => {
    const el = document.getElementById('screen-canvas') as HTMLElement;
    toPng(el).then((dataUrl) => {
      const link = document.createElement('a');
      link.download = 'Supabase Schema.png';
      link.href = dataUrl;
      link.click();
    });
  };

  const shareLink = () => {
    const encrypted = AES.encrypt(
      JSON.stringify({
        apikey: supabaseApiKey,
        schemaView: schemaView,
        tables: tables,
      }),
      'this password doesnt matter'
    ).toString();

    const url = new URL(window.location.href);
    url.hash = encrypted;
    copy(url.toString());
  };

  return (
    <>
      <div className="fixed right-5 bottom-5 z-10 flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          title={copied ? 'Copied' : 'Share link'}
          onClick={shareLink}
          className={copied ? 'bg-primary text-primary-foreground' : ''}
        >
          <Share2 size={20} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          title="Export Types"
          onClick={() => setExportTypes(true)}
        >
          <FileType size={20} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          title="Export SQL"
          onClick={() => setExportSQL(true)}
        >
          <Database size={20} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          title="Take a screenshot"
          onClick={screenshot}
        >
          <Camera size={20} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          title="Auto arrange"
          onClick={handleAutoArrange}
        >
          <Sparkles size={20} />
        </Button>

        <Button
          variant="outline"
          size="icon"
          title="Focus everything center"
          onClick={focusView}
        >
          <Target size={20} />
        </Button>

        <HelperZoom />
      </div>

      <ModalSQL open={exportSQL} onClose={() => setExportSQL(false)} />
      <ModalTypes open={exportTypes} onClose={() => setExportTypes(false)} />
    </>
  );
}
