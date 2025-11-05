# Phase 3: ReactFlow Integration - TODO

## Current Status
Phase 3 focuses on migrating from custom SVG-based schema visualization to ReactFlow for professional features and better UX.

---

## Pending Tasks

### 🔴 Critical (Blocking)
- [ ] **Install ReactFlow dependencies**
  - `@xyflow/react` - Core ReactFlow library
  - `@dagrejs/dagre` - Auto-layout algorithm
  - Update package.json and install

### 🟡 High Priority (Core Features)
- [ ] **Create custom TableNode component**
  - Location: `/src/components/flow/TableNode.tsx`
  - Replace current Table component logic
  - Add ReactFlow handles for connections
  - Style with Tailwind matching current design
  - Support primary key indicators
  - Support foreign key connection points

- [ ] **Create custom ViewNode component**
  - Location: `/src/components/flow/ViewNode.tsx`
  - Similar to TableNode but for database views
  - Different visual indicator (newspaper icon)

- [ ] **Create FlowCanvas component**
  - Location: `/src/components/flow/FlowCanvas.tsx`
  - Main ReactFlow wrapper
  - Replace current canvas implementation in page.tsx
  - Implement pan/zoom with ReactFlow
  - Add MiniMap, Controls, Background

- [ ] **Implement data conversion utilities**
  - Location: `/src/lib/flow-utils.ts`
  - Convert table data to ReactFlow nodes
  - Convert FK relationships to ReactFlow edges
  - Handle position persistence

- [ ] **Implement auto-layout with dagre**
  - Location: `/src/lib/layout.ts`
  - Dagre layout algorithm integration
  - Support multiple directions (TB, LR, BT, RL)
  - Smart spacing calculations
  - Preserve manual adjustments

### 🟢 Medium Priority (Enhancements)
- [ ] **Add custom edge styling**
  - Match current SVG connector appearance
  - Smooth/step edge types
  - Edge labels for relationship types
  - Animated edges on hover

- [ ] **Implement selection features**
  - Multi-select nodes (ReactFlow native)
  - Highlight related tables on selection
  - Context menu on right-click

- [ ] **Add keyboard shortcuts**
  - Ctrl/Cmd + A: Select all
  - Delete: Remove selected tables
  - Ctrl/Cmd + F: Search tables
  - Space: Fit view

- [ ] **Integrate with existing features**
  - ChatSidebar compatibility
  - Settings panel integration
  - Screenshot with ReactFlow export
  - Share link with positions

### 🔵 Low Priority (Polish)
- [ ] **Performance optimizations**
  - Lazy rendering for large schemas
  - Virtualization for 100+ tables
  - Memoization of expensive calculations

- [ ] **Accessibility**
  - Keyboard navigation
  - Screen reader support
  - Focus management
  - ARIA labels

- [ ] **Advanced features**
  - Table grouping
  - Relationship filtering
  - Zoom to selection
  - Export formats (PNG, SVG, JSON)

---

## Implementation Order

### Step 1: Setup (Day 1)
1. Install dependencies
2. Create directory structure
3. Set up TypeScript types

### Step 2: Core Components (Day 2-3)
1. TableNode component
2. ViewNode component
3. Data conversion utilities
4. Basic FlowCanvas integration

### Step 3: Feature Parity (Day 4-5)
1. Auto-layout implementation
2. Edge styling
3. Selection and highlighting
4. Pan/zoom controls

### Step 4: Integration (Day 6)
1. Replace main page implementation
2. Migrate all existing features
3. Ensure backwards compatibility
4. Update localStorage handling

### Step 5: Testing & Polish (Day 7)
1. Test with real schemas
2. Performance testing
3. Bug fixes
4. Documentation updates

---

## Files to Modify

### New Files
- `/src/components/flow/TableNode.tsx`
- `/src/components/flow/ViewNode.tsx`
- `/src/components/flow/FlowCanvas.tsx`
- `/src/components/flow/CustomEdge.tsx`
- `/src/lib/flow-utils.ts`
- `/src/lib/layout.ts`
- `/src/types/flow.ts`

### Modified Files
- `/src/app/page.tsx` - Integrate FlowCanvas
- `/src/lib/store.ts` - Add ReactFlow state
- `/src/components/Helper.tsx` - Update for ReactFlow
- `/package.json` - Add dependencies

### Deprecated Files (keep for reference)
- `/src/components/Table.tsx` - Replaced by TableNode
- `/src/components/Connector.tsx` - Replaced by ReactFlow edges

---

## Testing Checklist

### Functional Testing
- [ ] Tables render correctly
- [ ] Foreign keys show as edges
- [ ] Drag and drop works
- [ ] Pan and zoom smooth
- [ ] Auto-layout produces good results
- [ ] Selection works properly
- [ ] Dark mode compatibility
- [ ] LocalStorage persistence

### Performance Testing
- [ ] Load time with 10 tables
- [ ] Load time with 50 tables
- [ ] Load time with 100+ tables
- [ ] Memory usage acceptable
- [ ] Smooth animations at 60fps

### Compatibility Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers
- [ ] Different screen sizes

---

## Notes

### Current Implementation Details
- Custom SVG connectors in `Connector.tsx`
- Manual drag handling in `Table.tsx`
- Pan/zoom in `page.tsx` scrollEvent
- Selection with `@viselect/react`
- Position storage in Zustand + localStorage

### ReactFlow Benefits
- Built-in pan/zoom controls
- Native selection handling
- Performance optimized for large graphs
- Auto-layout ready
- Extensive customization
- Active community & documentation
- Accessibility features
- Export capabilities

### Migration Risks
- Bundle size increase (~40-50KB)
- Learning curve for customization
- Potential breaking changes
- Need to maintain backwards compatibility

### Mitigation Strategies
- Incremental migration approach
- Keep old implementation during transition
- Comprehensive testing
- User feedback collection
- Fallback options if issues arise

---

## Progress Tracking

**Phase 3 Started:** TBD
**Expected Completion:** TBD
**Status:** Not Started

### Completed ✅
- None yet

### In Progress 🚧
- Creating plan documents

### Blocked ⛔
- None

---

## Questions & Decisions

### Open Questions
1. Should we support custom edge types (one-to-many, many-to-many)?
2. What's the best default layout direction?
3. Should MiniMap be always visible or toggleable?
4. How to handle very large schemas (500+ tables)?

### Decisions Made
- Use `@xyflow/react` (latest ReactFlow)
- Use dagre for auto-layout
- Keep existing color scheme and styling
- Maintain localStorage format for compatibility

---

## Resources & References

- **ReactFlow Docs:** https://reactflow.dev/
- **Examples:** https://reactflow.dev/examples
- **Dagre Layout:** https://github.com/dagrejs/dagre
- **Current Codebase:** `/src/components/`
