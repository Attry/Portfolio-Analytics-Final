import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export function useSortableData<T>(
  items: T[], 
  defaultConfig: SortConfig = { key: null, direction: null }
) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultConfig);

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig.key && sortConfig.direction !== null) {
      sortableItems.sort((a: any, b: any) => {
        let aValue = a[sortConfig.key!];
        let bValue = b[sortConfig.key!];
        
        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: string) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }
    
    setSortConfig({ key: direction ? key : null, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
}
