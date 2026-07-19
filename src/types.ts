export interface ColorChannel {
  r: number; // 0 - 255 (normal 128)
  g: number; // 0 - 255 (normal 128)
  b: number; // 0 - 255 (normal 128)
}

export interface ColorGradingSettings {
  brightness: number; // 50 to 150
  contrast: number;   // 50 to 150
  saturation: number; // 0 to 200
  hueRotate: number;  // -180 to 180
  sepia: number;      // 0 to 100
  grayscale: number;  // 0 to 100
  temperature: number;// -50 to 50 (warm/cool)
  tint: number;       // -50 to 50 (green/magenta)
  vignette: number;   // 0 to 100
  shadows: ColorChannel;    // Lift
  midtones: ColorChannel;   // Gamma
  highlights: ColorChannel;  // Gain
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  descriptionUrdu?: string;
  settings: ColorGradingSettings;
}

export const INITIAL_SETTINGS: ColorGradingSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hueRotate: 0,
  sepia: 0,
  grayscale: 0,
  temperature: 0,
  tint: 0,
  vignette: 0,
  shadows: { r: 128, g: 128, b: 128 },
  midtones: { r: 128, g: 128, b: 128 },
  highlights: { r: 128, g: 128, b: 128 }
};

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: "original",
    name: "Original",
    description: "No color correction applied (Raw video look).",
    descriptionUrdu: "Asli video baghair kisi tabdeeli ke.",
    settings: { ...INITIAL_SETTINGS }
  },
  {
    id: "teal-orange",
    name: "Teal & Orange",
    description: "Classic Hollywood cinematic look with warm skin tones and teal-cool shadows.",
    descriptionUrdu: "Hollywood look - garm skin tones aur neeli parchiyan.",
    settings: {
      brightness: 98,
      contrast: 112,
      saturation: 115,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      temperature: 15,
      tint: -4,
      vignette: 25,
      shadows: { r: 115, g: 126, b: 138 },
      midtones: { r: 132, g: 128, b: 122 },
      highlights: { r: 142, g: 130, b: 116 }
    }
  },
  {
    id: "vintage-kodak",
    name: "Kodak Portra",
    description: "Analog warm nostalgic film grain style with faded blacks and rich sepia undertones.",
    descriptionUrdu: "Puranay zamane ke film camera jaisa garam andaz.",
    settings: {
      brightness: 102,
      contrast: 92,
      saturation: 85,
      hueRotate: 0,
      sepia: 22,
      grayscale: 0,
      temperature: 18,
      tint: -2,
      vignette: 15,
      shadows: { r: 132, g: 128, b: 122 },
      midtones: { r: 130, g: 128, b: 126 },
      highlights: { r: 136, g: 132, b: 120 }
    }
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    description: "High saturation sci-fi neon look with rich magenta highlights and electric cyan shadows.",
    descriptionUrdu: "Neon roshniyon aur mustaqbil ka sci-fi andaz.",
    settings: {
      brightness: 100,
      contrast: 118,
      saturation: 145,
      hueRotate: 5,
      sepia: 0,
      grayscale: 0,
      temperature: -15,
      tint: 12,
      vignette: 30,
      shadows: { r: 112, g: 124, b: 145 },
      midtones: { r: 132, g: 120, b: 140 },
      highlights: { r: 152, g: 110, b: 148 }
    }
  },
  {
    id: "bleach-bypass",
    name: "Bleach Bypass",
    description: "High contrast, desaturated cinematic style as seen in gritty action and war movies.",
    descriptionUrdu: "Tez contrast aur dhimay rangon ka gritty look.",
    settings: {
      brightness: 95,
      contrast: 135,
      saturation: 60,
      hueRotate: -5,
      sepia: 5,
      grayscale: 0,
      temperature: -5,
      tint: 5,
      vignette: 35,
      shadows: { r: 120, g: 122, b: 125 },
      midtones: { r: 126, g: 128, b: 130 },
      highlights: { r: 138, g: 138, b: 138 }
    }
  },
  {
    id: "cold-nordic",
    name: "Nordic Chill",
    description: "Cool desaturated Scandinavian vibe with pristine whites and blue-tinted shadows.",
    descriptionUrdu: "Thanda aur saaf Scandanavian mahool.",
    settings: {
      brightness: 102,
      contrast: 105,
      saturation: 82,
      hueRotate: 0,
      sepia: 0,
      grayscale: 0,
      temperature: -24,
      tint: 3,
      vignette: 18,
      shadows: { r: 118, g: 126, b: 138 },
      midtones: { r: 124, g: 128, b: 132 },
      highlights: { r: 128, g: 130, b: 135 }
    }
  },
  {
    id: "sunset-gold",
    name: "Sunset Gold",
    description: "Intense warm golden-hour lighting with rich amber highlights and soft shadows.",
    descriptionUrdu: "Guroob-e-Aftab ke waqt ki sunehri roshni.",
    settings: {
      brightness: 104,
      contrast: 108,
      saturation: 120,
      hueRotate: -2,
      sepia: 12,
      grayscale: 0,
      temperature: 28,
      tint: -10,
      vignette: 20,
      shadows: { r: 130, g: 125, b: 118 },
      midtones: { r: 135, g: 128, b: 115 },
      highlights: { r: 150, g: 134, b: 110 }
    }
  },
  {
    id: "noir",
    name: "Noir Cinema",
    description: "Classic high-contrast black & white style with dramatic lighting and silver highlights.",
    descriptionUrdu: "Siyah-o-Safaid drama aur qadeem Hollywood look.",
    settings: {
      brightness: 96,
      contrast: 130,
      saturation: 0,
      hueRotate: 0,
      sepia: 0,
      grayscale: 100,
      temperature: 0,
      tint: 0,
      vignette: 40,
      shadows: { r: 115, g: 115, b: 115 },
      midtones: { r: 128, g: 128, b: 128 },
      highlights: { r: 145, g: 145, b: 145 }
    }
  }
];

export const SAMPLE_VIDEOS = [
  {
    id: "cinematic-forest",
    name: "Cinematic Nature Forest",
    nameUrdu: "Sunehri Jungle",
    url: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4",
    poster: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400",
    vibe: "Warm, earthy forest with streaming sunlight - perfect for Kodak Portra or Sunset Gold!"
  },
  {
    id: "neon-city",
    name: "Cyberpunk Tokyo City",
    nameUrdu: "Tokyo Neon Shehar",
    url: "https://assets.mixkit.co/videos/preview/mixkit-neon-light-from-tokyo-streets-at-night-23395-large.mp4",
    poster: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=400",
    vibe: "Glistening neon-drenched urban streets at night - perfect for Cyberpunk Neon or Teal & Orange!"
  },
  {
    id: "mountain-mist",
    name: "Misty Mountain Peaks",
    nameUrdu: "Dhundlay Pahad",
    url: "https://assets.mixkit.co/videos/preview/mixkit-foggy-mountains-under-a-gloomy-sky-41484-large.mp4",
    poster: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400",
    vibe: "Cold, moody, epic mountains with low fog - perfect for Nordic Chill or Bleach Bypass!"
  }
];
