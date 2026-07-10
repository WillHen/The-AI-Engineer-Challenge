import MatrixRain from "@/components/MatrixRain";
import TerminalChat from "@/components/TerminalChat";

/**
 * Matrix operator terminal — digital rain behind Neo's chat uplink.
 */
export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-matrix-bg">
      <MatrixRain />
      <div className="crt-overlay" aria-hidden />
      <TerminalChat />
    </main>
  );
}
