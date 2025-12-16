import type p5 from "p5";

export type FilterType =
  | "normal"
  | "bw"
  | "vintage"
  | "highcontrast"
  | "rainbow"
  | "vibrant"
  | "coldblue"
  | "xray"
  | "neon";

export interface FilterInfo {
  id: FilterType;
  name: string;
}

// Filters arranged for 3x3 grid display (like classic Photo Booth)
export const FILTERS: FilterInfo[] = [
  { id: "rainbow", name: "Rainbow" },
  { id: "vibrant", name: "Vibrant" },
  { id: "coldblue", name: "Cold Blue" },
  { id: "highcontrast", name: "High Contrast" },
  { id: "normal", name: "Normal" },
  { id: "vintage", name: "Vintage" },
  { id: "xray", name: "X-Ray" },
  { id: "neon", name: "Neon" },
  { id: "bw", name: "Black & White" },
];

interface SketchConfig {
  containerWidth: number;
  containerHeight: number;
  onVideoReady: (video: HTMLVideoElement) => void;
}

export function createSketch(config: SketchConfig) {
  return (p: p5) => {
    let video: p5.Element;
    let currentFilter: FilterType = "normal";
    let canvas: p5.Renderer;

    // Expose setFilter method
    (p as p5 & { setFilter: (f: FilterType) => void }).setFilter = (f: FilterType) => {
      currentFilter = f;
    };

    p.setup = () => {
      canvas = p.createCanvas(config.containerWidth, config.containerHeight);
      (p as p5 & { canvas: HTMLCanvasElement }).canvas = canvas.elt as HTMLCanvasElement;

      // @ts-expect-error - p5 types issue with VIDEO constant
      video = p.createCapture(p.VIDEO, () => {
        const videoEl = video.elt as HTMLVideoElement;
        // Wait for video to be ready
        const checkReady = () => {
          if (videoEl.readyState >= 2) {
            config.onVideoReady(videoEl);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
      video.size(config.containerWidth, config.containerHeight);
      video.hide();

      p.pixelDensity(1);
    };

    p.draw = () => {
      if (!video) return;

      // Draw mirrored video
      p.push();
      p.translate(p.width, 0);
      p.scale(-1, 1);
      p.image(video, 0, 0, p.width, p.height);
      p.pop();

      // Apply filter
      applyFilter(p, currentFilter);
    };

    function applyFilter(p: p5, filter: FilterType) {
      if (filter === "normal") return;

      p.loadPixels();
      const pixels = p.pixels;

      switch (filter) {
        case "bw":
          for (let i = 0; i < pixels.length; i += 4) {
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            pixels[i] = avg;
            pixels[i + 1] = avg;
            pixels[i + 2] = avg;
          }
          break;

        case "vintage":
          // Warm sepia/vintage tone
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            pixels[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
            pixels[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
            pixels[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
          }
          break;

        case "highcontrast":
          for (let i = 0; i < pixels.length; i += 4) {
            const factor = 2.5;
            pixels[i] = Math.min(255, Math.max(0, factor * (pixels[i] - 128) + 128));
            pixels[i + 1] = Math.min(255, Math.max(0, factor * (pixels[i + 1] - 128) + 128));
            pixels[i + 2] = Math.min(255, Math.max(0, factor * (pixels[i + 2] - 128) + 128));
          }
          break;

        case "rainbow":
          // Cycle hue based on position - creates rainbow color shift
          const w = p.width;
          for (let i = 0; i < pixels.length; i += 4) {
            const x = (i / 4) % w;
            const hueShift = (x / w) * 360;
            const [r, g, b] = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
            const newHue = (r + hueShift) % 360;
            const [nr, ng, nb] = hslToRgb(newHue, Math.min(1, g * 1.5), b);
            pixels[i] = nr;
            pixels[i + 1] = ng;
            pixels[i + 2] = nb;
          }
          break;

        case "vibrant":
          // Boost saturation significantly - warm/orange tint
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            // Warm shift + saturation boost
            pixels[i] = Math.min(255, r * 1.3 + 30);
            pixels[i + 1] = Math.min(255, g * 0.9);
            pixels[i + 2] = Math.min(255, b * 0.7);
          }
          break;

        case "coldblue":
          // Cool blue/purple tint
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            pixels[i] = Math.min(255, r * 0.7 + 40);
            pixels[i + 1] = Math.min(255, g * 0.8 + 20);
            pixels[i + 2] = Math.min(255, b * 1.2 + 50);
          }
          break;

        case "xray":
          // Inverted with blue/cyan tint - like an X-ray
          for (let i = 0; i < pixels.length; i += 4) {
            const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            const inverted = 255 - avg;
            pixels[i] = Math.min(255, inverted * 0.7);
            pixels[i + 1] = Math.min(255, inverted * 1.1 + 30);
            pixels[i + 2] = Math.min(255, inverted * 1.2 + 50);
          }
          break;

        case "neon":
          // Hot pink/magenta neon glow
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const brightness = (r + g + b) / 3;
            // Pink/magenta shift with high saturation
            pixels[i] = Math.min(255, brightness * 0.9 + r * 0.5 + 60);
            pixels[i + 1] = Math.min(255, brightness * 0.3);
            pixels[i + 2] = Math.min(255, brightness * 0.7 + b * 0.5 + 40);
          }
          break;
      }

      p.updatePixels();
    }

    // Helper functions for color conversion
    function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return [h * 360, s, l];
    }

    function hslToRgb(h: number, s: number, l: number): [number, number, number] {
      h /= 360;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
  };
}

// Export the applyFilter function for use in filter previews
export function applyFilterToImageData(
  imageData: ImageData,
  filter: FilterType,
  width: number
): void {
  if (filter === "normal") return;

  const pixels = imageData.data;

  switch (filter) {
    case "bw":
      for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        pixels[i] = avg;
        pixels[i + 1] = avg;
        pixels[i + 2] = avg;
      }
      break;

    case "vintage":
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        pixels[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
        pixels[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
        pixels[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      }
      break;

    case "highcontrast":
      for (let i = 0; i < pixels.length; i += 4) {
        const factor = 2.5;
        pixels[i] = Math.min(255, Math.max(0, factor * (pixels[i] - 128) + 128));
        pixels[i + 1] = Math.min(255, Math.max(0, factor * (pixels[i + 1] - 128) + 128));
        pixels[i + 2] = Math.min(255, Math.max(0, factor * (pixels[i + 2] - 128) + 128));
      }
      break;

    case "rainbow":
      for (let i = 0; i < pixels.length; i += 4) {
        const x = (i / 4) % width;
        const hueShift = (x / width) * 360;
        const [h, s, l] = rgbToHslStatic(pixels[i], pixels[i + 1], pixels[i + 2]);
        const newHue = (h + hueShift) % 360;
        const [nr, ng, nb] = hslToRgbStatic(newHue, Math.min(1, s * 1.5), l);
        pixels[i] = nr;
        pixels[i + 1] = ng;
        pixels[i + 2] = nb;
      }
      break;

    case "vibrant":
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        pixels[i] = Math.min(255, r * 1.3 + 30);
        pixels[i + 1] = Math.min(255, g * 0.9);
        pixels[i + 2] = Math.min(255, b * 0.7);
      }
      break;

    case "coldblue":
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        pixels[i] = Math.min(255, r * 0.7 + 40);
        pixels[i + 1] = Math.min(255, g * 0.8 + 20);
        pixels[i + 2] = Math.min(255, b * 1.2 + 50);
      }
      break;

    case "xray":
      for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        const inverted = 255 - avg;
        pixels[i] = Math.min(255, inverted * 0.7);
        pixels[i + 1] = Math.min(255, inverted * 1.1 + 30);
        pixels[i + 2] = Math.min(255, inverted * 1.2 + 50);
      }
      break;

    case "neon":
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const brightness = (r + g + b) / 3;
        pixels[i] = Math.min(255, brightness * 0.9 + r * 0.5 + 60);
        pixels[i + 1] = Math.min(255, brightness * 0.3);
        pixels[i + 2] = Math.min(255, brightness * 0.7 + b * 0.5 + 40);
      }
      break;
  }
}

function rgbToHslStatic(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgbStatic(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

