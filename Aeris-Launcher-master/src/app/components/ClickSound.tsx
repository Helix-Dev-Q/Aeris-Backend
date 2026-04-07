"use client";

import { useEffect } from "react";
import { useConfigStore } from "@/app/packages/zustand/configs";

export function ClickSound() {
  const soundOnClick = useConfigStore((s) => s.soundOnClick);

  useEffect(() => {
    if (!soundOnClick) return;

    const playClick = () => {
      const ctx = new AudioContext();
      const now = ctx.currentTime;

      // Low thump — sine wave with fast pitch drop
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
      oscGain.gain.setValueAtTime(0.5, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);

      // Soft noise burst for the "pop" texture
      const bufferSize = Math.floor(ctx.sampleRate * 0.05);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 600;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    };

    window.addEventListener("mousedown", playClick);
    return () => window.removeEventListener("mousedown", playClick);
  }, [soundOnClick]);

  return null;
}
