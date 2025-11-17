'use client';

import { useStore } from '@/lib/store';
import { Column, TableIndex } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  X,
  Search,
  ArrowLeft,
  Edit,
  Maximize2,
  MoreVertical,
  GripVertical,
  Key,
  Hash,
  Search as SearchIcon,
  Circle,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import { useState } from 'react';
import { ColorPicker } from './ColorPicker';

const DATA_TYPES = [
  'serial',
  'bigint',
  'integer',
  'int',
  'smallint',
  'varchar',
  'text',
  'boolean',
  'timestamp',
  'timestamptz',
  'date',
  'json',
  'jsonb',
  'numeric',
  'decimal',
  'enum',
];

const COLORS = [
  '#EC4899', // pink
  '#A855F7', // purple
  '#1E40AF', // dark blue
  '#3B82F6', // light blue
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#84CC16', // lime green
  '#22C55E', // green
  '#EAB308', // yellow
  '#F97316', // orange
  '#EF4444', // red
  '#6B7280', // grey
];

interface TableEditorProps {
  tableId: string;
  onClose: () => void;
}

type IndexType = 'primary_key' | 'unique_key' | 'index' | 'none';

export function TableEditor({ tableId, onClose }: TableEditorProps) {
  const {
    tables,
    updateTableName,
    updateTableColor,
    addColumn,
    updateColumn,
    deleteColumn,
    updateColumn: updateColumnStore,
  } = useStore();

  const table = tables[tableId];
  const [selectedTableId, setSelectedTableId] = useState<string | null>(tableId);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTableName, setEditingTableName] = useState(false);
  const [tableNameValue, setTableNameValue] = useState(table?.title || '');
  const [newIndexColumns, setNewIndexColumns] = useState<string[]>([]);

  if (!table) return null;

  const tableIds = Object.keys(tables);
  const filteredTableIds = searchQuery
    ? tableIds.filter((id) =>
        tables[id]?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tableIds;

  const currentTable = tables[selectedTableId || tableId] || table;

  const handleAddColumn = () => {
    const newColumn: Column = {
      title: 'new_column',
      format: 'bigint',
      type: 'number',
      required: false,
    };
    addColumn(selectedTableId || tableId, newColumn);
  };

  const handleUpdateColumn = (columnIndex: number, updates: Partial<Column>) => {
    updateColumn(selectedTableId || tableId, columnIndex, updates);
  };

  const handleDeleteColumn = (columnIndex: number) => {
    deleteColumn(selectedTableId || tableId, columnIndex);
  };

  const handleSaveTableName = () => {
    if (tableNameValue.trim() && tableNameValue !== currentTable.title) {
      updateTableName(selectedTableId || tableId, tableNameValue.trim());
    }
    setEditingTableName(false);
  };

  const getIndexType = (column: Column): IndexType => {
    if (column.pk) return 'primary_key';
    if (column.unique) return 'unique_key';
    // Check if column is in any index
    const indexes = currentTable.indexes || [];
    const isInIndex = indexes.some((idx) =>
      idx.columns.includes(column.title)
    );
    if (isInIndex) return 'index';
    return 'none';
  };

  const handleIndexTypeChange = (
    columnIndex: number,
    indexType: IndexType
  ) => {
    const column = currentTable.columns?.[columnIndex];
    if (!column) return;

    const updates: Partial<Column> = {};
    if (indexType === 'primary_key') {
      updates.pk = true;
      updates.unique = false;
      // Primary keys are always required
      updates.required = true;
    } else if (indexType === 'unique_key') {
      updates.unique = true;
      updates.pk = false;
    } else {
      updates.pk = false;
      updates.unique = false;
    }
    handleUpdateColumn(columnIndex, updates);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex">
      {/* Left Sidebar - Table List */}
      <div className="w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">Tables</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSearchQuery('')}
            >
              <Search className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTableIds.map((id) => {
            const t = tables[id];
            const isSelected = id === (selectedTableId || tableId);
            return (
              <div
                key={id}
                onClick={() => setSelectedTableId(id)}
                className={`px-4 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-purple-500/20 border-l-2 border-purple-500'
                    : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm ${
                      isSelected ? 'text-purple-300' : 'text-slate-300'
                    }`}
                  >
                    {t?.title}
                  </span>
                  {isSelected && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTableName(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Delete table</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-slate-950">
        {/* Table Header */}
        <div
          className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between"
          style={{
            backgroundColor: currentTable.color
              ? `${currentTable.color}20`
              : undefined,
          }}
        >
          <div className="flex items-center gap-3">
            {editingTableName ? (
              <Input
                value={tableNameValue}
                onChange={(e) => setTableNameValue(e.target.value)}
                onBlur={handleSaveTableName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTableName();
                  if (e.key === 'Escape') {
                    setTableNameValue(currentTable.title);
                    setEditingTableName(false);
                  }
                }}
                className="text-lg font-semibold bg-transparent border-slate-600 focus:border-slate-500"
                autoFocus
              />
            ) : (
              <h1 className="text-lg font-semibold text-slate-200">
                {currentTable.title}
              </h1>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setEditingTableName(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Maximize2 className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Delete table</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Columns Section */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {currentTable.columns?.map((column, index) => {
              const indexType = getIndexType(column);
              return (
                <div
                  key={`${column.title}-${index}`}
                  className="group flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-800/40 transition-colors"
                >
                  {/* Drag Handle */}
                  <GripVertical className="h-4 w-4 text-slate-500 cursor-move" />

                  {/* Column Name */}
                  <Input
                    value={column.title}
                    onChange={(e) =>
                      handleUpdateColumn(index, { title: e.target.value })
                    }
                    className="flex-1 h-8 text-sm bg-transparent border-transparent hover:border-slate-700 focus:border-slate-600 rounded"
                    placeholder="column_name"
                  />

                  {/* Data Type */}
                  <Select
                    value={column.format || column.type || 'varchar'}
                    onValueChange={(value) =>
                      handleUpdateColumn(index, { format: value })
                    }
                  >
                    <SelectTrigger className="h-8 w-32 text-sm bg-transparent border-slate-700 rounded">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATA_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Nullability Indicator */}
                  <button
                    onClick={() =>
                      handleUpdateColumn(index, {
                        required: !column.required,
                      })
                    }
                    className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded transition-colors ${
                      column.required
                        ? 'text-green-400'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    N
                  </button>

                  {/* Index Type Selector */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        {indexType === 'primary_key' ? (
                          <Key className="h-4 w-4 text-green-500" />
                        ) : indexType === 'unique_key' ? (
                          <Hash className="h-4 w-4 text-blue-400" />
                        ) : indexType === 'index' ? (
                          <SearchIcon className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-500" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2 bg-slate-800 border-slate-700">
                      <div className="space-y-1">
                        <div className="px-2 py-1 text-xs font-medium text-slate-400">
                          INDEX TYPE
                        </div>
                        <button
                          onClick={() =>
                            handleIndexTypeChange(index, 'primary_key')
                          }
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                            indexType === 'primary_key'
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Key className="h-4 w-4" />
                          Primary key
                        </button>
                        <button
                          onClick={() =>
                            handleIndexTypeChange(index, 'unique_key')
                          }
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                            indexType === 'unique_key'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Hash className="h-4 w-4" />
                          Unique key
                        </button>
                        <button
                          onClick={() => handleIndexTypeChange(index, 'index')}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                            indexType === 'index'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <SearchIcon className="h-4 w-4" />
                          Index
                        </button>
                        <button
                          onClick={() => handleIndexTypeChange(index, 'none')}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                            indexType === 'none'
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Circle className="h-4 w-4" />
                          None
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* More Options */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteColumn(index)}
                        className="text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>

          {/* Indexes Section */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-400 mb-2">
                Indexes
              </div>
              <div className="relative">
                <Input
                  placeholder="Select columns"
                  value={newIndexColumns.join(', ')}
                  className="h-9 bg-slate-800/40 border-slate-700 focus:border-teal-500"
                  readOnly
                />
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-500" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>View indexes</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <Button
                variant="outline"
                className="flex-1 bg-transparent border-slate-700 hover:bg-slate-800"
              >
                Add Index
              </Button>
              <Button
                onClick={handleAddColumn}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Color Picker */}
      <div className="w-12 bg-slate-900/50 border-l border-slate-700/50 flex flex-col items-center pt-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Change table color"
            >
              <div className="flex gap-0.5">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: currentTable.color || '#3B82F6' }}
                />
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: currentTable.color || '#3B82F6' }}
                />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3 bg-slate-800 border-slate-700" align="end">
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="h-8 w-8 rounded transition-all hover:scale-110 relative"
                  style={{
                    backgroundColor: color,
                  }}
                  onClick={() =>
                    updateTableColor(selectedTableId || tableId, color)
                  }
                >
                  {(currentTable.color || '#3B82F6') === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-3 w-3 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

