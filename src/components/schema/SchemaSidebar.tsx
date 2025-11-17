'use client';

import { useState } from 'react';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SchemaSidebarGui } from './SchemaSidebarGui';
import { SchemaSidebarSql } from './SchemaSidebarSql';

type SidebarMode = 'gui' | 'sql';

export function SchemaSidebar() {
  const [mode, setMode] = useState<SidebarMode>('gui');
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="pointer-events-auto absolute left-0 top-0 z-40 h-full w-12 bg-slate-900/95 border-r border-slate-700/50 flex items-start justify-center pt-4 shadow-2xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="h-8 w-8 p-0"
          title="Expand sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute left-0 top-0 z-40 h-full w-80 bg-slate-900/95 backdrop-blur border-r border-slate-700/50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-3 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Schema Editor</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7 p-0"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="px-3 py-2 border-b border-slate-700/50">
          <div className="flex items-center gap-1 p-0.5 bg-slate-800/40 rounded-md">
            <button
              onClick={() => setMode('gui')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                mode === 'gui'
                  ? 'bg-slate-700 text-slate-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              GUI
            </button>
            <button
              onClick={() => setMode('sql')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                mode === 'sql'
                  ? 'bg-slate-700 text-slate-200 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              SQL
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {mode === 'gui' ? <SchemaSidebarGui /> : <SchemaSidebarSql />}
        </div>
      </div>
  );
}
