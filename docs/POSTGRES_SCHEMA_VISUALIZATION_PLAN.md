# Postgres Schema Visualization Migration Plan

## Overview
Migration from custom SVG-based schema visualization to ReactFlow for enhanced features, better performance, and professional UI/UX.

## Project Context
- **Current State**: Custom implementation with manual positioning, SVG connectors, and drag handlers
- **Target State**: ReactFlow-based implementation with auto-layout, controls, and advanced features
- **Framework**: Next.js 15 + React 19 + TypeScript

---

## Phase 1: Foundation ✅
- [x] Migrate from Vue.js 3 to Next.js 15
- [x] Implement ShadCN UI design system
- [x] Set up Zustand state management
- [x] Basic table rendering and manual positioning
- [x] Custom SVG connectors for foreign keys
- [x] Pan/zoom functionality
- [x] Selection area for multiple tables
- [x] Sample data loading

---

## Phase 2: Enhanced Features ✅
- [x] ChatSidebar with AI integration
- [x] Dark mode support
- [x] Screenshot functionality
- [x] Auto-arrange basic functionality
- [x] Settings panel
- [x] Helper components

---

## Phase 3: ReactFlow Integration 🚧

### 3.1 Dependencies & Setup
- [ ] Install ReactFlow (`@xyflow/react`)
- [ ] Install dagre for auto-layout
- [ ] Configure ReactFlow types

### 3.2 Custom Node Components
- [ ] Create TableNode component (replaces current Table component)
  - Database table visualization
  - Column list with types
  - Primary key indicators
  - Foreign key connection points (handles)
- [ ] Create ViewNode component (for database views)
- [ ] Style nodes with Tailwind (consistent with current design)

### 3.3 Core Migration
- [ ] Convert tables to ReactFlow nodes
- [ ] Convert foreign key relationships to ReactFlow edges
- [ ] Implement custom edge styling (matching current SVG connectors)
- [ ] Migrate pan/zoom to ReactFlow controls
- [ ] Preserve table positions from localStorage

### 3.4 Auto-Layout
- [ ] Implement dagre layout algorithm
- [ ] Add layout direction options (TB, LR, BT, RL)
- [ ] Smart spacing based on table sizes
- [ ] Maintain aspect ratios

### 3.5 ReactFlow Features
- [ ] MiniMap for navigation
- [ ] Controls panel (zoom in/out/fit)
- [ ] Background grid/dots
- [ ] Node selection (multi-select)
- [ ] Edge labels for relationship types
- [ ] Connection validation

### 3.6 Enhanced Interactions
- [ ] Click table to highlight relationships
- [ ] Hover effects on nodes/edges
- [ ] Double-click to focus on table
- [ ] Right-click context menu
- [ ] Export to image (ReactFlow native)

### 3.7 Performance & Polish
- [ ] Optimize for large schemas (100+ tables)
- [ ] Lazy rendering for off-screen nodes
- [ ] Smooth animations
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements

---

## Phase 4: Advanced Features (Future)
- [ ] Table grouping by schema
- [ ] Relationship filtering
- [ ] Search and filter tables
- [ ] SQL query builder from diagram
- [ ] Version comparison
- [ ] Collaborative editing

---

## Technical Architecture

### ReactFlow Node Structure
```typescript
{
  id: string;              // table name
  type: 'table' | 'view';
  position: { x, y };
  data: {
    title: string;
    columns: Column[];
    is_view: boolean;
  }
}
```

### ReactFlow Edge Structure
```typescript
{
  id: string;                        // unique edge id
  source: string;                    // source table
  target: string;                    // target table
  sourceHandle: string;              // column with FK
  targetHandle: string;              // referenced column
  type: 'smoothstep' | 'step';
  animated: boolean;
}
```

### State Management
- Zustand store for app state
- ReactFlow store for diagram state
- Sync positions to localStorage
- Preserve user arrangements

---

## Migration Strategy

### Step-by-step Approach
1. Add ReactFlow alongside current implementation
2. Create new `/reactflow` route for testing
3. Build custom nodes matching current design
4. Migrate features incrementally
5. AB test both implementations
6. Switch main route once stable
7. Remove old implementation

### Backwards Compatibility
- Import existing localStorage data
- Preserve table positions
- Maintain share link format
- Keep current API structure

---

## Success Metrics
- [ ] All current features working in ReactFlow
- [ ] Performance: Handle 100+ tables smoothly
- [ ] UX: Auto-layout saves 80% of manual positioning
- [ ] Bundle size: <50KB increase
- [ ] Zero breaking changes for users

---

## Resources
- ReactFlow Docs: https://reactflow.dev/
- Dagre Layout: https://github.com/dagrejs/dagre
- Current Implementation: `/src/components/Table.tsx`
