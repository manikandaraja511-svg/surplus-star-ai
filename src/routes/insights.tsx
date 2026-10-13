import { createFileRoute } from '@tanstack/react-router';
import { Insights } from '@/features/foodwise/insights';
import { headFor } from '@/features/foodwise/shell';
export const Route = createFileRoute('/insights')({head:()=>headFor('AI-Assisted Insights','Transparent potential-surplus calculations, historical average demand and configurable demonstration thresholds.'),component:Insights});
