import FeedbackForm from "@/components/FeedbackForm";

export const metadata = { title: "Feedback and reports" };

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; profile?: string }>;
}) {
  const { kind, profile } = await searchParams;
  const slug = profile && /^[a-f0-9]{10}$/.test(profile) ? profile : undefined;

  return (
    <main className="wrap">
      <header className="page-head">
        <h1>Feedback and reports</h1>
        <p className="muted">
          Found a bug, spotted wrong points, or have an idea? Tell us here. For a points mismatch, include what SkillRack
          shows and what SkillRack Hub shows.
        </p>
      </header>
      <FeedbackForm initialKind={kind} slug={slug} />
    </main>
  );
}
