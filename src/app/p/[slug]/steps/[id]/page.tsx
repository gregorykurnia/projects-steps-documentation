import { notFound } from "next/navigation";
import { EditStepForm } from "@/components/EditStepForm";
import { PageHeader } from "@/components/PageHeader";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { getProjectBySlug, getStep, listProjectLinks } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit step" };

export default async function EditStepPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const project = await getProjectBySlug(slug);
  const uuid = /^[0-9a-f-]{36}$/i.test(id);
  const [step, projectLinks] = await Promise.all([project && uuid ? getStep(id) : null, listProjectLinks()]);
  if (!project || !step || step.projectId !== project.id) notFound();
  return (
    <div>
      <PageHeader
        eyebrow={<ProjectSwitcher currentId={project.id} projects={projectLinks} compact />}
        title="Edit step"
        description={step.title}
      />
      <EditStepForm step={step} slug={slug} />
    </div>
  );
}
