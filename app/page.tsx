import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <h1>Kursi.ge Reward Demo</h1>
      <p>Use the registration success page to view the Wheel of Fortune flow.</p>
      <Link href="/register/success">Go to registration success</Link>
    </main>
  );
}
