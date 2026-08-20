import { HealthCard } from "@/components/health-card";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Project Intelligence Agent</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Agentic research over live engineering and project data.
        </p>
      </div>
      <HealthCard />
    </main>
  );
}
