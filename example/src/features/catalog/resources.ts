import type { StrictResourceDefinition } from '../resource-types';

export const catalogResources = [
  {
      name: 'products',
      label: 'Products',
      icon: 'folder',
      group: 'Inventory',
      menuOrder: 10,
      fields: [
        { key: 'id', label: 'ID', type: 'number', showInForm: false, width: '72px' },
        { key: 'name', label: 'Name', type: 'text', required: true, searchable: true },
        { key: 'sku', label: 'SKU', type: 'text', required: true, searchable: true, width: '140px' },
        { key: 'categoryId', label: 'Category', type: 'relation', resource: 'categories', optionLabel: 'name', optionValue: 'id' },
        { key: 'supplierId', label: 'Supplier', type: 'relation', resource: 'suppliers', optionLabel: 'name', optionValue: 'id' },
        { key: 'price', label: 'Price', type: 'number', required: true, width: '110px' },
        { key: 'stock', label: 'Stock', type: 'number', required: true, width: '100px' },
        { key: 'minStock', label: 'Min Stock', type: 'number', required: true, width: '110px' },
        { key: 'description', label: 'Description', type: 'textarea', showInList: false },
      ],
      defaultSort: { field: 'name', order: 'asc' },
    },
] satisfies StrictResourceDefinition<'products'>[];
