import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/foodwise/dashboard";
import { headFor } from "@/features/foodwise/shell";
export const Route = createFileRoute("/analytics")({
  head: () =>
    headFor(
      "Food Analytics",
      "Explore recorded food trends, surplus by category and actual reuse, redistribution and discard outcomes.",
    ),
  component: Analytics,
});
function Analytics() {
  return <Dashboard analytics />;
}
