import { createFileRoute } from '@tanstack/react-router';
import { Dashboard } from '@/features/foodwise/dashboard';
import { headFor } from '@/features/foodwise/shell';
export const Route = createFileRoute('/dashboard')({head:()=>headFor('Food Dashboard','Live food preparation, service, surplus and recorded outcome metrics from your saved records.'),component:Dashboard});
