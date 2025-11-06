'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { Search, X, Filter, Table as TableIcon, Eye, History, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  tableId: string;
  tableName: string;
  matchType: 'table' | 'column' | 'view';
  matchedColumn?: string;
  isView?: boolean;
}

interface SearchBarProps {
  onJumpToTable: (tableId: string) => void;
}

export function SearchBar({ onJumpToTable }: SearchBarProps) {
  const { tables } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tables' | 'views' | 'columns'>('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((query: string) => {
    if (!query.trim()) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      const updated = [query, ...filtered].slice(0, 10); // Keep only 10 recent
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Perform search
  const performSearch = useCallback((query: string, filter: typeof filterType) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    Object.entries(tables).forEach(([tableId, table]) => {
      const tableName = table.title.toLowerCase();
      const isView = table.is_view || false;

      // Filter by type
      if (filter === 'tables' && isView) return;
      if (filter === 'views' && !isView) return;

      // Search by table/view name
      if (tableName.includes(lowerQuery) && filter !== 'columns') {
        results.push({
          tableId,
          tableName: table.title,
          matchType: isView ? 'view' : 'table',
          isView,
        });
      }

      // Search by column name
      if (filter === 'all' || filter === 'columns') {
        table.columns?.forEach((column) => {
          if (column.title.toLowerCase().includes(lowerQuery)) {
            results.push({
              tableId,
              tableName: table.title,
              matchType: 'column',
              matchedColumn: column.title,
              isView,
            });
          }
        });
      }
    });

    // Sort results: exact matches first, then partial matches
    results.sort((a, b) => {
      const aExact = a.tableName.toLowerCase() === lowerQuery;
      const bExact = b.tableName.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.tableName.localeCompare(b.tableName);
    });

    setSearchResults(results);
    setSelectedIndex(0);
  }, [tables]);

  // Handle search input change
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    performSearch(value, filterType);
  }, [filterType, performSearch]);

  // Handle filter change
  const handleFilterChange = useCallback((filter: typeof filterType) => {
    setFilterType(filter);
    performSearch(searchQuery, filter);
  }, [searchQuery, performSearch]);

  // Handle result selection
  const handleSelectResult = useCallback((result: SearchResult) => {
    saveRecentSearch(searchQuery);
    onJumpToTable(result.tableId);
    setIsOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  }, [searchQuery, saveRecentSearch, onJumpToTable]);

  // Handle recent search click
  const handleRecentSearchClick = useCallback((query: string) => {
    setSearchQuery(query);
    performSearch(query, filterType);
    inputRef.current?.focus();
  }, [filterType, performSearch]);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('recent-searches');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && searchResults.length > 0) {
        e.preventDefault();
        handleSelectResult(searchResults[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, handleSelectResult]);

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current && searchResults.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, searchResults.length]);

  // Global keyboard shortcut (Ctrl/Cmd + F)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      {!isOpen ? (
        <Button
          variant="outline"
          size="default"
          onClick={() => setIsOpen(true)}
          className="shadow-lg bg-background/95 backdrop-blur"
        >
          <Search size={16} className="mr-2" />
          Search tables... <kbd className="ml-2 text-xs">⌘F</kbd>
        </Button>
      ) : (
        <div className="w-[600px] bg-background/95 backdrop-blur border rounded-lg shadow-xl">
          {/* Search Input */}
          <div className="flex items-center gap-2 p-3 border-b">
            <Search size={18} className="text-muted-foreground flex-shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search by table or column name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              autoFocus
            />

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <Filter size={16} />
                  {filterType !== 'all' && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {filterType}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48" align="end">
                <div className="space-y-1">
                  <Button
                    variant={filterType === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === 'tables' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('tables')}
                  >
                    <TableIcon size={14} className="mr-2" />
                    Tables Only
                  </Button>
                  <Button
                    variant={filterType === 'views' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('views')}
                  >
                    <Eye size={14} className="mr-2" />
                    Views Only
                  </Button>
                  <Button
                    variant={filterType === 'columns' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleFilterChange('columns')}
                  >
                    <ChevronDown size={14} className="mr-2" />
                    Columns Only
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsOpen(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="flex-shrink-0"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Results / Recent Searches */}
          <div className="max-h-[400px] overflow-y-auto" ref={resultsRef}>
            {searchQuery.trim() ? (
              // Search Results
              searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.tableId}-${result.matchedColumn || 'table'}-${index}`}
                      className={cn(
                        'w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center justify-between',
                        index === selectedIndex && 'bg-accent'
                      )}
                      onClick={() => handleSelectResult(result)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {result.isView ? (
                          <Eye size={16} className="text-purple-500 flex-shrink-0" />
                        ) : (
                          <TableIcon size={16} className="text-blue-500 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.tableName}</div>
                          {result.matchedColumn && (
                            <div className="text-xs text-muted-foreground truncate">
                              Column: {result.matchedColumn}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {result.matchType}
                      </Badge>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No results found for &ldquo;{searchQuery}&rdquo;
                </div>
              )
            ) : (
              // Recent Searches
              recentSearches.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <History size={14} />
                      Recent Searches
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecentSearches}
                      className="h-6 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  {recentSearches.map((query, index) => (
                    <button
                      key={index}
                      className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center gap-3"
                      onClick={() => handleRecentSearchClick(query)}
                    >
                      <History size={14} className="text-muted-foreground" />
                      <span className="text-sm">{query}</span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Footer with hints */}
          <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> Close
            </span>
            <span className="ml-auto">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
