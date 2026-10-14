import { NewProjectForm } from "@/components/NewProjectForm";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div>
      <PageHeader title="New project" description="Name it, and paste your notes if you have them. You can also add steps later." />
      <NewProjectForm />
    </div>
  );
}
