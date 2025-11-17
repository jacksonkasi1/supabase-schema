'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { TableState } from '@/lib/types';
import { generateSchemaSQL, generateTableSQL, parseSchemaSQL } from '@/lib/schema-sql';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function SchemaSidebarSql() {
  const { tables, enumTypes, updateTablesFromAI } = useStore();
  const [selectedTable, setSelectedTable] = useState<string>('__all__');
  const [sql, setSql] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tableIds = Object.keys(tables);

  useEffect(() => {
    if (selectedTable === '__all__') {
      setSql(generateSchemaSQL(tables, enumTypes));
    } else if (tables[selectedTable]) {
      setSql(generateTableSQL(selectedTable, tables[selectedTable], enumTypes));
    }
    setError(null);
  }, [selectedTable, tables, enumTypes]);

  const handleApply = () => {
    const result = parseSchemaSQL(sql);

    if (result.error) {
      setError(result.error);
      toast.error('SQL Parse Error', { description: result.error });
      return;
    }

    const hasTables = Object.keys(result.tables).length > 0;
    const hasEnums = Object.keys(result.enumTypes).length > 0;

    if (!hasTables && !hasEnums) {
      setError('No schema definitions detected');
      toast.error('Nothing to apply');
      return;
    }

    if (selectedTable === '__all__') {
      updateTablesFromAI(result.tables, { enumTypes: result.enumTypes });
      setError(null);
      toast.success('Schema updated from SQL');
      return;
    }

    const parsedTables = Object.entries(result.tables);
    if (parsedTables.length === 0) {
      setError('Provide SQL for the selected table');
      toast.error('Missing table definition');
      return;
    }

    if (parsedTables.length > 1) {
      setError('Multiple tables detected. Use Whole schema mode instead.');
      toast.error('Multiple tables detected');
      return;
    }

    const [newKey, newTable] = parsedTables[0];
    const nextTables: TableState = {};

    Object.entries(tables).forEach(([tableId, tableValue]) => {
      if (tableId === selectedTable) return;
      nextTables[tableId] = tableValue;
    });

    const preservedPosition =
      tables[selectedTable]?.position ?? newTable.position ?? { x: 0, y: 0 };

    nextTables[newKey] = {
      ...newTable,
      position: preservedPosition,
    };

    const mergedEnums = {
      ...enumTypes,
      ...result.enumTypes,
    };

    updateTablesFromAI(nextTables, { enumTypes: mergedEnums });
    setSelectedTable(newKey);
    setError(null);
    toast.success('Table updated from SQL');
  };

  const handleReset = () => {
    if (selectedTable === '__all__') {
      setSql(generateSchemaSQL(tables, enumTypes));
    } else if (tables[selectedTable]) {
      setSql(generateTableSQL(selectedTable, tables[selectedTable], enumTypes));
    }
    setError(null);
    toast.success('SQL reset from schema');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700/50 space-y-2">
        <div className="text-xs font-medium text-slate-400">SQL Schema Editor</div>
        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="h-8 text-sm bg-slate-800/40 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Whole schema</SelectItem>
            {tableIds.map((id) => (
              <SelectItem key={id} value={id}>
                {tables[id]?.title || id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Editor */}
      <div className="flex-1 p-3 overflow-hidden">
        <Textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="w-full h-full font-mono text-xs bg-slate-900/50 border-slate-700 resize-none"
          placeholder="CREATE TABLE ..."
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-3 mb-2 p-2 bg-red-950/20 border border-red-900/50 rounded text-xs text-red-400 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 border-t border-slate-700/50 flex gap-2">
        <Button onClick={handleApply} size="sm" className="flex-1 h-8 text-xs">
          Apply SQL
        </Button>
        <Button onClick={handleReset} variant="outline" size="sm" className="h-8 px-2">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
