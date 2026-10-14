import { notFound } from "next/navigation";
import { EditStepForm } from "@/components/EditStepForm";
import { PageHeader } from "@/components/PageHeader";
import { getProjectBySlug, getStep } from "@/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit step" };

export default async function EditStepPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const project = await getProjectBySlug(slug);
  const uuid = /^[0-9a-f-]{36}$/i.test(id);
  const step = project && uuid ? await getStep(id) : null;
  if (!project || !step || step.projectId !== project.id) notFound();
  return (
    <div>
      <PageHeader title="Edit step" description={`${project.name} · ${step.title}`} />
      <EditStepForm step={step} slug={slug} />
    </div>
  );
}
