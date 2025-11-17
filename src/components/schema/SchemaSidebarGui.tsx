'use client';

import { useStore } from '@/lib/store';
import { TableCard } from './TableCard';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useState, useMemo } from 'react';

export function SchemaSidebarGui() {
  const { tables } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  const tableIds = useMemo(() => Object.keys(tables), [tables]);

  const filteredTableIds = useMemo(() => {
    if (!searchQuery.trim()) return tableIds;
    const query = searchQuery.toLowerCase();
    return tableIds.filter((id) =>
      tables[id]?.title?.toLowerCase().includes(query)
    );
  }, [tableIds, tables, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-2 py-2 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tables..."
            className="h-7 pl-7 text-xs bg-muted/30 border-border/50"
          />
        </div>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTableIds.length > 0 ? (
          filteredTableIds.map((tableId) => (
            <TableCard key={tableId} tableId={tableId} />
          ))
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">
            {searchQuery ? 'No tables found' : 'No tables in schema'}
          </div>
        )}
      </div>
    </div>
  );
}
