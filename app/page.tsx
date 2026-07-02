import Stage from "@/components/gl/Stage";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Nav from "@/components/sections/Nav";
import Hero from "@/components/sections/Hero";
import Capabilities from "@/components/sections/Capabilities";
import WhyQ0r from "@/components/sections/WhyQ0r";
import HowItWorks from "@/components/sections/HowItWorks";
import ShareCompute from "@/components/sections/ShareCompute";
import Token from "@/components/sections/Token";
import Developers from "@/components/sections/Developers";
import CtaBand from "@/components/sections/CtaBand";
import Footer from "@/components/sections/Footer";

// the landing page sells what q0r lets people do — capabilities, not
// simulated scale. protocol activity lives in the explorer, reached
// through receipts and navigation.
export default function Home() {
  return (
    <SmoothScroll>
      <Stage />
      <Nav />
      <main>
        <Hero />
        <Capabilities />
        <WhyQ0r />
        <HowItWorks />
        <ShareCompute />
        <Token />
        <Developers />
        <CtaBand />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
