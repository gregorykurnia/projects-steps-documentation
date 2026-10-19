import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { getProjectBySlug, listProjectLinks } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Project settings" };

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const [project, projectLinks] = await Promise.all([getProjectBySlug((await params).slug), listProjectLinks()]);
  if (!project) notFound();
  return (
    <div>
      <PageHeader
        eyebrow={<ProjectSwitcher currentId={project.id} projects={projectLinks} hrefSuffix="/settings" compact />}
        title="Project settings"
      />
      <ProjectSettingsForm project={project} />
    </div>
  );
}
