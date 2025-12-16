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
  | "neon"
  | "warmglow"
  | "sunset"
  | "mirror"
  | "pixelate"
  | "stretch"
  | "bulge"
  | "glitch"
  | "thermal"
  | "comic";

export interface FilterInfo {
  id: FilterType;
  name: string;
}

// Filters arranged for 3x3 grid pages (like classic Photo Booth)
// PAGE 1: COLOR EFFECTS
// PAGE 2: DISTORTION EFFECTS
export const FILTERS: FilterInfo[] = [
  // Page 1: Color Effects
  { id: "vibrant", name: "Vibrant" },
  { id: "normal", name: "Normal" },
  { id: "coldblue", name: "Cold Blue" },
  { id: "vintage", name: "Vintage" },
  { id: "highcontrast", name: "High Contrast" },
  { id: "bw", name: "Black & White" },
  { id: "neon", name: "Neon" },
  { id: "warmglow", name: "Warm Glow" },
  { id: "sunset", name: "Sunset" },
  // Page 2: Distortion Effects
  { id: "rainbow", name: "Rainbow" },
  { id: "xray", name: "X-Ray" },
  { id: "mirror", name: "Mirror" },
  { id: "pixelate", name: "Pixelate" },
  { id: "stretch", name: "Stretch" },
  { id: "bulge", name: "Bulge" },
  { id: "glitch", name: "Glitch" },
  { id: "thermal", name: "Thermal" },
  { id: "comic", name: "Comic" },
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
    (p as p5 & { setFilter: (f: FilterType) => void }).setFilter = (
      f: FilterType
    ) => {
      currentFilter = f;
    };

    p.setup = () => {
      canvas = p.createCanvas(config.containerWidth, config.containerHeight);
      (p as p5 & { canvas: HTMLCanvasElement }).canvas =
        canvas.elt as HTMLCanvasElement;

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
            pixels[i] = Math.min(
              255,
              Math.max(0, factor * (pixels[i] - 128) + 128)
            );
            pixels[i + 1] = Math.min(
              255,
              Math.max(0, factor * (pixels[i + 1] - 128) + 128)
            );
            pixels[i + 2] = Math.min(
              255,
              Math.max(0, factor * (pixels[i + 2] - 128) + 128)
            );
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
    function rgbToHsl(
      r: number,
      g: number,
      b: number
    ): [number, number, number] {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      let h = 0,
        s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }
      return [h * 360, s, l];
    }

    function hslToRgb(
      h: number,
      s: number,
      l: number
    ): [number, number, number] {
      h /= 360;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
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
        pixels[i] = Math.min(
          255,
          Math.max(0, factor * (pixels[i] - 128) + 128)
        );
        pixels[i + 1] = Math.min(
          255,
          Math.max(0, factor * (pixels[i + 1] - 128) + 128)
        );
        pixels[i + 2] = Math.min(
          255,
          Math.max(0, factor * (pixels[i + 2] - 128) + 128)
        );
      }
      break;

    case "rainbow":
      for (let i = 0; i < pixels.length; i += 4) {
        const x = (i / 4) % width;
        const hueShift = (x / width) * 360;
        const [h, s, l] = rgbToHslStatic(
          pixels[i],
          pixels[i + 1],
          pixels[i + 2]
        );
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

    case "warmglow":
      // Warm golden/amber glow
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        pixels[i] = Math.min(255, r * 1.2 + 40);
        pixels[i + 1] = Math.min(255, g * 1.05 + 20);
        pixels[i + 2] = Math.min(255, b * 0.6);
      }
      break;

    case "sunset":
      // Orange/pink gradient based on position
      for (let i = 0; i < pixels.length; i += 4) {
        const y = Math.floor(i / 4 / width);
        const height = imageData.height;
        const gradientPos = y / height;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        pixels[i] = Math.min(255, r * (1.3 - gradientPos * 0.3) + 50);
        pixels[i + 1] = Math.min(255, g * (0.7 + gradientPos * 0.2));
        pixels[i + 2] = Math.min(255, b * (0.8 + gradientPos * 0.5) + 30);
      }
      break;

    case "thermal":
      // Heat vision / thermal camera look
      for (let i = 0; i < pixels.length; i += 4) {
        const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        if (avg < 64) {
          pixels[i] = 0;
          pixels[i + 1] = 0;
          pixels[i + 2] = avg * 3;
        } else if (avg < 128) {
          pixels[i] = (avg - 64) * 4;
          pixels[i + 1] = 0;
          pixels[i + 2] = 255 - (avg - 64) * 2;
        } else if (avg < 192) {
          pixels[i] = 255;
          pixels[i + 1] = (avg - 128) * 4;
          pixels[i + 2] = 0;
        } else {
          pixels[i] = 255;
          pixels[i + 1] = 255;
          pixels[i + 2] = (avg - 192) * 4;
        }
      }
      break;

    case "comic":
      // Posterize / comic book effect
      const levels = 5;
      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.floor(pixels[i] / (256 / levels)) * (256 / levels);
        pixels[i + 1] =
          Math.floor(pixels[i + 1] / (256 / levels)) * (256 / levels);
        pixels[i + 2] =
          Math.floor(pixels[i + 2] / (256 / levels)) * (256 / levels);
      }
      break;

    case "glitch":
      // RGB channel split / glitch effect
      const glitchOffset = 8;
      const tempPixels = new Uint8ClampedArray(pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        const x = (i / 4) % width;
        if (x >= glitchOffset) {
          pixels[i] = tempPixels[i - glitchOffset * 4];
        }
        if (x < width - glitchOffset) {
          pixels[i + 2] = tempPixels[i + 2 + glitchOffset * 4];
        }
      }
      break;

    case "mirror":
      // Mirror effect - copy left half to right (pixel manipulation)
      for (let i = 0; i < pixels.length; i += 4) {
        const x = (i / 4) % width;
        if (x >= width / 2) {
          const mirrorX = width - 1 - x;
          const y = Math.floor(i / 4 / width);
          const srcIdx = (y * width + mirrorX) * 4;
          pixels[i] = pixels[srcIdx];
          pixels[i + 1] = pixels[srcIdx + 1];
          pixels[i + 2] = pixels[srcIdx + 2];
        }
      }
      break;

    case "pixelate":
      // Pixelate effect
      const pixelSize = 12;
      const height = imageData.height;
      for (let blockY = 0; blockY < height; blockY += pixelSize) {
        for (let blockX = 0; blockX < width; blockX += pixelSize) {
          let totalR = 0,
            totalG = 0,
            totalB = 0,
            count = 0;
          for (let py = 0; py < pixelSize && blockY + py < height; py++) {
            for (let px = 0; px < pixelSize && blockX + px < width; px++) {
              const idx = ((blockY + py) * width + (blockX + px)) * 4;
              totalR += pixels[idx];
              totalG += pixels[idx + 1];
              totalB += pixels[idx + 2];
              count++;
            }
          }
          const avgR = totalR / count;
          const avgG = totalG / count;
          const avgB = totalB / count;
          for (let py = 0; py < pixelSize && blockY + py < height; py++) {
            for (let px = 0; px < pixelSize && blockX + px < width; px++) {
              const idx = ((blockY + py) * width + (blockX + px)) * 4;
              pixels[idx] = avgR;
              pixels[idx + 1] = avgG;
              pixels[idx + 2] = avgB;
            }
          }
        }
      }
      break;

    case "stretch":
      // Vertical stretch from center
      const stretchHeight = imageData.height;
      const tempStretch = new Uint8ClampedArray(pixels);
      for (let y = 0; y < stretchHeight; y++) {
        const distFromCenter =
          Math.abs(y - stretchHeight / 2) / (stretchHeight / 2);
        const stretch = 1 + (1 - distFromCenter) * 0.5;
        const srcY = Math.floor(
          stretchHeight / 2 + (y - stretchHeight / 2) / stretch
        );
        if (srcY >= 0 && srcY < stretchHeight) {
          for (let x = 0; x < width; x++) {
            const destIdx = (y * width + x) * 4;
            const srcIdx = (srcY * width + x) * 4;
            pixels[destIdx] = tempStretch[srcIdx];
            pixels[destIdx + 1] = tempStretch[srcIdx + 1];
            pixels[destIdx + 2] = tempStretch[srcIdx + 2];
          }
        }
      }
      break;

    case "bulge":
      // Fisheye / bulge effect
      const bulgeHeight = imageData.height;
      const srcPixels = new Uint8ClampedArray(pixels);
      const centerX = width / 2;
      const centerY = bulgeHeight / 2;
      const radius = Math.min(width, bulgeHeight) / 2;
      const strength = 1.8;
      for (let y = 0; y < bulgeHeight; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const destIdx = (y * width + x) * 4;
          if (dist < radius) {
            const amount = Math.pow(dist / radius, strength);
            const srcX = Math.floor(centerX + dx * amount);
            const srcY = Math.floor(centerY + dy * amount);
            if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < bulgeHeight) {
              const srcIdx = (srcY * width + srcX) * 4;
              pixels[destIdx] = srcPixels[srcIdx];
              pixels[destIdx + 1] = srcPixels[srcIdx + 1];
              pixels[destIdx + 2] = srcPixels[srcIdx + 2];
            }
          }
        }
      }
      break;
  }
}

function rgbToHslStatic(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s, l];
}

function hslToRgbStatic(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  h /= 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
