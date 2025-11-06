'use client';

import { useCallback } from 'react';
import { ChevronDown, ChevronRight, EyeOff } from 'lucide-react';
import { useStore } from '@/lib/store';

interface SchemaGroupProps {
  schema: string;
  color?: string;
}

/**
 * SchemaGroup component - Visual boundary for tables in the same schema
 * Displays a colored border with schema name and collapse/visibility controls
 */
export function SchemaGroup({ schema, color = '#3B82F6' }: SchemaGroupProps) {
  const { collapsedSchemas, toggleSchemaCollapse, toggleSchemaVisibility } = useStore();

  const isCollapsed = collapsedSchemas.has(schema);

  const handleToggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSchemaCollapse(schema);
  }, [schema, toggleSchemaCollapse]);

  const handleToggleVisibility = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSchemaVisibility(schema);
  }, [schema, toggleSchemaVisibility]);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        border: `2px solid ${color}`,
        borderRadius: '8px',
        backgroundColor: `${color}10`, // 10% opacity
      }}
    >
      {/* Schema Header */}
      <div
        className="absolute -top-8 left-0 flex items-center gap-2 px-3 py-1 rounded-t-lg pointer-events-auto"
        style={{
          backgroundColor: color,
          color: 'white',
        }}
      >
        {/* Collapse Toggle */}
        <button
          onClick={handleToggleCollapse}
          className="hover:bg-white/20 rounded p-1 transition-colors"
          title={isCollapsed ? 'Expand schema' : 'Collapse schema'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Schema Name */}
        <span className="font-semibold text-sm">{schema}</span>

        {/* Visibility Toggle */}
        <button
          onClick={handleToggleVisibility}
          className="hover:bg-white/20 rounded p-1 transition-colors ml-2"
          title="Hide schema"
        >
          <EyeOff size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Get schema color based on schema name
 */
export function getSchemaColor(schema: string): string {
  const colors: Record<string, string> = {
    public: '#3B82F6',     // Blue
    auth: '#10B981',       // Green
    storage: '#F59E0B',    // Amber
    extensions: '#8B5CF6', // Purple
    graphql: '#EC4899',    // Pink
    realtime: '#14B8A6',   // Teal
    vault: '#EF4444',      // Red
  };

  return colors[schema.toLowerCase()] || '#6B7280'; // Default: Gray
}
