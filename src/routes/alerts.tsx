import { createFileRoute } from '@tanstack/react-router';
import { Alerts } from '@/features/foodwise/insights';
import { headFor } from '@/features/foodwise/shell';
export const Route = createFileRoute('/alerts')({head:()=>headFor('Alert Center','Review potential surplus, unusual quantities, missing information and approaching use-by dates with human oversight.'),component:Alerts});
