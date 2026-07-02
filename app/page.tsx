import Stage from "@/components/gl/Stage";
import SmoothScroll from "@/components/providers/SmoothScroll";
import Nav from "@/components/sections/Nav";
import Hero from "@/components/sections/Hero";
import Ticker from "@/components/sections/Ticker";
import WhyQ0r from "@/components/sections/WhyQ0r";
import ShareCompute from "@/components/sections/ShareCompute";
import Workloads from "@/components/sections/Workloads";
import HowItWorks from "@/components/sections/HowItWorks";
import NetworkState from "@/components/sections/NetworkState";
import Token from "@/components/sections/Token";
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
        <WhyQ0r />
        <ShareCompute />
        <Workloads />
        <HowItWorks />
        <NetworkState />
        <Token />
        <Developers />
        <CtaBand />
      </main>
      <Footer />
    </SmoothScroll>
  );
}
