import Stage from "@/components/gl/Stage";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Nav from "@/components/sections/Nav";
import Hero from "@/components/sections/Hero";
import Ticker from "@/components/sections/Ticker";
import SystemStrip from "@/components/sections/SystemStrip";
import Features from "@/components/sections/Features";
import Analytics from "@/components/sections/Analytics";
import Protocol from "@/components/sections/Protocol";
import Developers from "@/components/sections/Developers";
import CtaBand from "@/components/sections/CtaBand";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <Stage />
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <SystemStrip />
        <Features />
        <Analytics />
        <Protocol />
        <Developers />
        <CtaBand />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
