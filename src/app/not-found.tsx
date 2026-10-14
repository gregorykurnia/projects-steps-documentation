import { PageHeader } from "@/components/PageHeader";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div>
      <PageHeader title="Page not found" description="That page doesn't exist, or it was deleted." />
      <LinkButton href="/" variant="primary">
        Back to all projects
      </LinkButton>
    </div>
  );
}
