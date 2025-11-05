import { RelationshipType, RelationshipTypeInfo } from '@/types/flow';

export const RELATIONSHIP_TYPES: Record<RelationshipType, RelationshipTypeInfo> = {
  'one-to-one': {
    label: '1:1',
    description: 'One-to-One',
    color: '#3b82f6', // blue
    sourceMarker: '1',
    targetMarker: '1',
  },
  'one-to-many': {
    label: '1:N',
    description: 'One-to-Many',
    color: '#10b981', // green
    sourceMarker: '1',
    targetMarker: 'N',
  },
  'many-to-one': {
    label: 'N:1',
    description: 'Many-to-One',
    color: '#f59e0b', // amber
    sourceMarker: 'N',
    targetMarker: '1',
  },
  'many-to-many': {
    label: 'N:M',
    description: 'Many-to-Many',
    color: '#8b5cf6', // purple
    sourceMarker: 'N',
    targetMarker: 'M',
  },
};

export function getRelationshipInfo(type: RelationshipType): RelationshipTypeInfo {
  return RELATIONSHIP_TYPES[type];
}

export function getRelationshipColor(type: RelationshipType): string {
  return RELATIONSHIP_TYPES[type].color;
}

export function getRelationshipLabel(type: RelationshipType): string {
  return RELATIONSHIP_TYPES[type].label;
}
