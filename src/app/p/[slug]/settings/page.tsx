import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";
import { getProjectBySlug } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project settings" };

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const project = await getProjectBySlug((await params).slug);
  if (!project) notFound();
  return (
    <div>
      <PageHeader title="Project settings" description={project.name} />
      <ProjectSettingsForm project={project} />
    </div>
  );
}
