'use client';

import { useMemo } from 'react';
import { Eye, EyeOff, Database } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getAllSchemas, groupTablesBySchema } from '@/lib/flow-utils';
import { getSchemaColor } from './SchemaGroup';

/**
 * SchemaFilter component - Control panel for schema visibility
 * Allows users to show/hide schemas and see table counts
 */
export function SchemaFilter() {
  const { tables, visibleSchemas, toggleSchemaVisibility, showAllSchemas, hideAllSchemas } = useStore();

  // Get all schemas and their table counts
  const schemaInfo = useMemo(() => {
    const allSchemas = getAllSchemas(tables);
    const groupedTables = groupTablesBySchema(tables);

    return allSchemas.map((schema) => ({
      name: schema,
      count: groupedTables[schema]?.length || 0,
      color: getSchemaColor(schema),
      isVisible: visibleSchemas.has(schema),
    }));
  }, [tables, visibleSchemas]);

  const allVisible = schemaInfo.every((s) => s.isVisible);
  const noneVisible = schemaInfo.every((s) => !s.isVisible);

  if (schemaInfo.length === 0) {
    return null; // No schemas to display
  }

  return (
    <div className="absolute top-5 right-5 z-30 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-warm-gray-200 dark:border-dark-border p-4 min-w-[240px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-warm-gray-600 dark:text-warm-gray-400" />
          <h3 className="font-semibold text-sm text-warm-gray-800 dark:text-warm-gray-200">
            Schemas
          </h3>
        </div>

        {/* Show All / Hide All */}
        <div className="flex items-center gap-1">
          <button
            onClick={showAllSchemas}
            disabled={allVisible}
            className="px-2 py-1 text-xs rounded hover:bg-warm-gray-100 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Show all schemas"
          >
            Show All
          </button>
          <button
            onClick={hideAllSchemas}
            disabled={noneVisible}
            className="px-2 py-1 text-xs rounded hover:bg-warm-gray-100 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Hide all schemas"
          >
            Hide All
          </button>
        </div>
      </div>

      {/* Schema List */}
      <div className="space-y-2">
        {schemaInfo.map((schema) => (
          <button
            key={schema.name}
            onClick={() => toggleSchemaVisibility(schema.name)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-warm-gray-50 dark:hover:bg-dark-700 transition-colors group"
          >
            {/* Schema Name & Color Indicator */}
            <div className="flex items-center gap-2 flex-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: schema.color }}
              />
              <span className="text-sm font-medium text-warm-gray-700 dark:text-warm-gray-300">
                {schema.name}
              </span>
              <span className="text-xs text-warm-gray-500 dark:text-warm-gray-500">
                ({schema.count})
              </span>
            </div>

            {/* Visibility Toggle */}
            <div className="flex-shrink-0">
              {schema.isVisible ? (
                <Eye size={16} className="text-blue-600 dark:text-blue-400" />
              ) : (
                <EyeOff size={16} className="text-warm-gray-400 dark:text-warm-gray-600" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 pt-3 border-t border-warm-gray-200 dark:border-dark-border">
        <div className="text-xs text-warm-gray-600 dark:text-warm-gray-400">
          {visibleSchemas.size} of {schemaInfo.length} schemas visible
        </div>
      </div>
    </div>
  );
}
