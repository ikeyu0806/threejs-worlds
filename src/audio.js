// Synthesized locally: no audio downloads or autoplay.
export function createAmbience() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  const context = new AudioContext();
  const master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
  const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < samples.length; i++) { previous = (previous + (Math.random() * 2 - 1) * 0.04) / 1.04; samples[i] = previous * 4; }
  const rain = context.createBufferSource(); rain.buffer = buffer; rain.loop = true;
  const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1900;
  const rainGain = context.createGain(); rainGain.gain.value = 0.3;
  rain.connect(filter); filter.connect(rainGain); rainGain.connect(master); rain.start();
  const oscillators = [55, 82.41, 110.2].map(frequency => {
    const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    const gain = context.createGain(); gain.gain.value = 0.026;
    oscillator.connect(gain); gain.connect(master); oscillator.start(); return oscillator;
  });
  return {
    async enable(on) { await context.resume(); master.gain.setTargetAtTime(on ? 0.65 : 0, context.currentTime, 0.25); },
    rain(amount) { rainGain.gain.setTargetAtTime(amount * 0.42, context.currentTime, 0.3); },
    dispose() { rain.stop(); oscillators.forEach(o => o.stop()); context.close(); },
  };
}
