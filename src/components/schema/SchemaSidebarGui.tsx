'use client';

import { useStore } from '@/lib/store';
import { TableCard } from './TableCard';
import { TableEditor } from './TableEditor';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';

export function SchemaSidebarGui() {
  const { tables } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTableId, setEditingTableId] = useState<string | null>(null);

  const tableIds = useMemo(() => Object.keys(tables), [tables]);

  const filteredTableIds = useMemo(() => {
    if (!searchQuery.trim()) return tableIds;
    const query = searchQuery.toLowerCase();
    return tableIds.filter((id) =>
      tables[id]?.title?.toLowerCase().includes(query)
    );
  }, [tableIds, tables, searchQuery]);

  if (editingTableId) {
    return (
      <TableEditor
        tableId={editingTableId}
        onClose={() => setEditingTableId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-700/50">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="h-8 pl-8 text-sm bg-slate-800/40 border-slate-700"
          />
        </div>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {filteredTableIds.length > 0 ? (
          filteredTableIds.map((tableId) => (
            <div
              key={tableId}
              onClick={() => setEditingTableId(tableId)}
              className="cursor-pointer"
            >
              <TableCard tableId={tableId} />
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-sm text-slate-500">
            {searchQuery ? 'No tables found' : 'No tables in schema'}
          </div>
        )}
      </div>
    </div>
  );
}
