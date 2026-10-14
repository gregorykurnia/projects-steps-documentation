"use client";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <PageHeader title="Something went wrong" description="The page couldn't load. Nothing was lost; try again." />
      <Button variant="primary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
