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
  Target,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ModalSQL } from './ModalSQL';
import { ModalTypes } from './ModalTypes';
import { HelperZoom } from './HelperZoom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AES from 'crypto-js/aes';

interface HelperProps {
  onChatOpen?: () => void;
  isChatOpen?: boolean;
}

export function Helper({ onChatOpen, isChatOpen = false }: HelperProps) {
  const { tables, schemaView, supabaseApiKey, triggerLayout, triggerFitView } =
    useStore();
  const { copy, copied } = useClipboard();
  const [exportSQL, setExportSQL] = useState(false);
  const [exportTypes, setExportTypes] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);

  const handleAutoArrange = () => {
    triggerLayout();
  };

  const handleFitView = () => {
    triggerFitView();
  };

  const screenshot = () => {
    // Target the ReactFlow container
    const el = document.querySelector('.react-flow') as HTMLElement;

    if (!el) {
      console.error('ReactFlow container not found');
      return;
    }

    toPng(el, {
      skipFonts: true,
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = 'Supabase Schema.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((error) => {
        console.error('Error taking screenshot:', error);
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
      <div 
        className={cn(
          "fixed right-5 bottom-5 z-40 flex items-center space-x-2",
          "transition-all duration-300 ease-in-out",
          isChatOpen ? "mr-[420px]" : "mr-0"
        )}
      >
        {/* Toggle toolbar visibility button */}
        <Button
          variant="outline"
          size="icon"
          title={isToolbarExpanded ? "Hide toolbar" : "Show toolbar"}
          onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
        >
          {isToolbarExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>

        {/* All other buttons - shown only when expanded */}
        {isToolbarExpanded && (
          <>
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
              title="Fit view"
              onClick={handleFitView}
            >
              <Target size={20} />
            </Button>

            {onChatOpen && (
              <Button
                variant="outline"
                size="icon"
                title="Open SQL AI Chat"
                onClick={onChatOpen}
              >
                <MessageSquare size={20} />
              </Button>
            )}

            <HelperZoom />
          </>
        )}
      </div>

      <ModalSQL open={exportSQL} onClose={() => setExportSQL(false)} />
      <ModalTypes open={exportTypes} onClose={() => setExportTypes(false)} />
    </>
  );
}
