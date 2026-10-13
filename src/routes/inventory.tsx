import { createFileRoute } from '@tanstack/react-router';
import { Inventory } from '@/features/foodwise/inventory';
import { headFor } from '@/features/foodwise/shell';
export const Route = createFileRoute('/inventory')({head:()=>headFor('Food Inventory','Manage food preparation records, validate quantities, track outcomes and export your inventory.'),component:Inventory});
