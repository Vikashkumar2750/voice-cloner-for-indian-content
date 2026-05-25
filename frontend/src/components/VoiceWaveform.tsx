import { useEffect, useRef } from "react";

interface VoiceWaveformProps {
  status: "idle" | "encoding" | "synthesizing" | "analyzing" | "recording" | "playing";
  color?: string;
  height?: number;
}

export function VoiceWaveform({ status, color = "#E05A47", height = 80 }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = height;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    let phase = 0;
    const barCount = 45;
    const bars: { x: number; targetHeight: number; currentHeight: number }[] = [];

    // Initialize bars
    for (let i = 0; i < barCount; i++) {
      bars.push({
        x: i * (canvas.width / barCount),
        targetHeight: 5,
        currentHeight: 5,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      phase += 0.08;

      const scale = canvas.width / barCount;
      const centerY = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        const bar = bars[i];
        bar.x = i * scale;

        let amplitude = 4;
        if (status === "recording") {
          amplitude = Math.abs(Math.sin(phase + i * 0.15)) * (canvas.height * 0.7) + Math.random() * 15;
        } else if (status === "playing") {
          amplitude = Math.abs(Math.sin(phase + i * 0.25)) * (canvas.height * 0.6) + Math.sin(phase * 2) * 5 + 4;
        } else if (status === "analyzing" || status === "synthesizing" || status === "encoding") {
          const indexOffset = (phase * 15) % barCount;
          const distToPulse = Math.abs(i - indexOffset);
          amplitude = distToPulse < 5 ? (5 - distToPulse) * (canvas.height * 0.12) + 6 : 4;
        } else {
          amplitude = Math.abs(Math.sin(phase + i * 0.05)) * 6 + 3;
        }

        // Smooth height transition
        bar.targetHeight = amplitude;
        bar.currentHeight += (bar.targetHeight - bar.currentHeight) * 0.2;

        ctx.fillStyle = status === "recording" ? "#F59E0B" : color;
        ctx.beginPath();
        
        const w = Math.max(2, scale - 4);
        const y = centerY - bar.currentHeight / 2;
        const r = w / 2;

        // Draw rounded capsule
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(bar.x, y, w, bar.currentHeight, r);
          ctx.fill();
        } else {
          ctx.fillRect(bar.x, y, w, bar.currentHeight);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [status, color, height]);

  return (
    <div className="w-full bg-slate-900/60 p-4 rounded-xl border border-slate-800 backdrop-blur-sm shadow-inner relative overflow-hidden">
      <div className="absolute top-2 left-3 flex items-center space-x-2">
        <span className={`w-2 h-2 rounded-full ${
          status === "recording" ? "bg-amber-500 animate-pulse" :
          status === "playing" ? "bg-emerald-500 animate-pulse" :
          status === "analyzing" || status === "synthesizing" ? "bg-indigo-500 animate-pulse" :
          "bg-slate-600"
        }`} />
        <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400">
          {status === "recording" ? "Recording Active Mic" :
           status === "playing" ? "Voice Output Monitor" :
           status === "analyzing" ? "Gemini Vocal DNA Scanning" :
           status === "synthesizing" ? "Cloned Speech Synthesis" :
           status === "encoding" ? "Encoding Audio Stream" :
           "Vocal Signal Idle"}
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-16 pointer-events-none mt-2" />
    </div>
  );
}
