import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a consistent color for a table based on its name.
 * Returns a color from an expanded palette of 12 vibrant colors.
 */
export function getTableHeaderColor(tableName: string): string {
  // Expanded color palette with 12 vibrant colors
  const colors = [
    '#EC4899', // Bright medium pink
    '#A855F7', // Medium purple
    '#8B5CF6', // Muted blue-purple/lavender
    '#3B82F6', // Bright medium blue
    '#14B8A6', // Teal/mint green
    '#06B6D4', // Bright cyan/light blue
    '#84CC16', // Vibrant lime green
    '#22C55E', // Medium green
    '#EAB308', // Bright yellow
    '#F97316', // Medium orange
    '#EF4444', // Bright red
    '#6B7280', // Medium gray
  ];

  // Simple hash function to consistently map table names to colors
  let hash = 0;
  for (let i = 0; i < tableName.length; i++) {
    hash = tableName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}
