import AddProfileForm from "@/components/AddProfileForm";

export default function Home() {
  return (
    <main className="wrap">
      <section className="hero">
        <h1>See your SkillRack progress the way LeetCode shows yours.</h1>
        <p>Points by category, a daily streak, a heatmap, and your rank in your college. Paste your resume link once and it updates every day.</p>
      </section>

      <AddProfileForm />

      <section className="panel">
        <h2>Where to find your resume link</h2>
        <ol className="steps">
          <li>Sign in to SkillRack and open your profile.</li>
          <li>Open your Resume and copy its share link.</li>
          <li>Paste it above. The link is only used to read your public resume page and is never shown to other people.</li>
        </ol>
      </section>
    </main>
  );
}
