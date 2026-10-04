// Noir palette: the world is silver black-and-white; only LIGHT has colour.
// signal = neon red (the sung word, the only thing that blooms by default); ember = the white-hot core of a lit tube;
// blood = unlit / dying red glass; acid = teal neon and CRT light (the machine's voice). Extra neon colours live in noir.ts.
// Keep the key names: the engine's GLSL constants (C_INK, C_SIGNAL...) are built from them.
export const HEX = {
  ink: '#060708', // night
  ink2: '#15171B', // wet asphalt, raised panels
  graphite: '#4C5057', // dim lines, secondary text
  ash: '#9EA2A8', // silver mid-tone
  bone: '#E8E5DE', // silver highlights, primary type
  signal: '#FF2B4E', // neon red: the sung word
  ember: '#FFD3DA', // white-hot core of a lit tube
  blood: '#6E0B1D', // unlit red glass, string, stamps
  acid: '#35E3E6', // teal neon / CRT: the machine
} as const;
