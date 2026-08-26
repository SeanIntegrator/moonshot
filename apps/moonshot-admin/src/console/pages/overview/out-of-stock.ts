import type { AdminStockFoodRow, AdminStockOptionRow, AdminStockResponse } from '@moonshot/types';
import { groupStockOptions } from '../stock/stock-meta.js';

export type OutOfStockItem = {
  id: string;
  name: string;
  chipTone: 'amber' | 'red';
  chipLabel: string;
};

export type OutOfStockSection = {
  key: string;
  title: string;
  items: OutOfStockItem[];
};

function optionChip(row: AdminStockOptionRow): Pick<OutOfStockItem, 'chipTone' | 'chipLabel'> {
  if (row.availability === 'out_today') {
    return { chipTone: 'amber', chipLabel: 'Out today' };
  }
  return { chipTone: 'red', chipLabel: 'Out' };
}

function foodItem(row: AdminStockFoodRow): OutOfStockItem {
  return {
    id: row.itemId,
    name: row.name,
    chipTone: 'red',
    chipLabel: 'Off the menu',
  };
}

/** Groups out options by modifier group, then appends a Food section when needed. */
export function outOfStockSections(stock: AdminStockResponse): OutOfStockSection[] {
  const outOptions = stock.options.filter((row) => row.availability !== 'in');
  const outFood = stock.food.filter((row) => row.availability === 'out');
  const sections: OutOfStockSection[] = groupStockOptions(outOptions).map((group) => ({
    key: group.groupId,
    title: group.groupName,
    items: group.options.map((row) => ({
      id: row.optionId,
      name: row.name,
      ...optionChip(row),
    })),
  }));

  if (outFood.length > 0) {
    sections.push({
      key: 'food',
      title: 'Food',
      items: outFood.map(foodItem),
    });
  }

  return sections;
}
