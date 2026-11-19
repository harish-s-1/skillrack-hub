import Explainer from "@/components/Explainer";

export const metadata = { title: "Explain my code" };

export default function ExplainPage() {
  return (
    <main className="wrap">
      <header className="page-head">
        <h1>Understand the code you solved</h1>
        <p className="muted">Paste a problem and your solution. You get a step-by-step walkthrough, the idea behind it, its complexity and a similar problem to try.</p>
      </header>
      <Explainer />
    </main>
  );
}
