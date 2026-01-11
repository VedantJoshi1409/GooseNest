import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import FeaturesGrid from "./components/FeaturesGrid";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <FeaturesGrid />
      </main>
    </div>
  );
}
