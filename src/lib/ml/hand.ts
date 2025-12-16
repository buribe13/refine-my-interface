// Hand tracking using ml5.js handpose

let handpose: ReturnType<typeof import("ml5").handPose> | null = null;
let predictions: HandPrediction[] = [];
let video: HTMLVideoElement | null = null;

interface HandPrediction {
  keypoints: Array<{
    x: number;
    y: number;
    name: string;
  }>;
}

export interface HandState {
  isPinching: boolean;
  position: { x: number; y: number } | null;
  pinchDistance?: number;
}

// Pinch detection thresholds
const PINCH_THRESHOLD = 40; // Distance in pixels between thumb and index tip
const PINCH_HYSTERESIS = 10; // Hysteresis to prevent flickering

let isPinchingState = false;
let consecutivePinchFrames = 0;
const REQUIRED_PINCH_FRAMES = 3; // Require N consecutive frames to confirm pinch

export async function initHandpose(videoElement: HTMLVideoElement): Promise<void> {
  video = videoElement;

  return new Promise((resolve, reject) => {
    const loadMl5 = async () => {
      try {
        const ml5 = await import("ml5");

        // @ts-expect-error - ml5 types are incomplete
        handpose = ml5.handPose(video, { maxHands: 1, flipHorizontal: false }, () => {
          console.log("Handpose model loaded");

          // Start detection
          // @ts-expect-error - ml5 types are incomplete
          handpose.detectStart(video, (results: HandPrediction[]) => {
            predictions = results || [];
          });

          resolve();
        });
      } catch (err) {
        console.error("Failed to load handpose:", err);
        reject(err);
      }
    };

    loadMl5();
  });
}

export function getHandState(): HandState {
  if (predictions.length === 0) {
    isPinchingState = false;
    consecutivePinchFrames = 0;
    return { isPinching: false, position: null };
  }

  const hand = predictions[0];
  const keypoints = hand.keypoints;

  // Find thumb tip and index finger tip
  const thumbTip = keypoints.find((k) => k.name === "thumb_tip");
  const indexTip = keypoints.find((k) => k.name === "index_finger_tip");

  if (!thumbTip || !indexTip) {
    isPinchingState = false;
    consecutivePinchFrames = 0;
    return { isPinching: false, position: null };
  }

  // Calculate distance between thumb and index
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Pinch detection with hysteresis
  const threshold = isPinchingState
    ? PINCH_THRESHOLD + PINCH_HYSTERESIS
    : PINCH_THRESHOLD;

  const isPinchingNow = distance < threshold;

  // Require consecutive frames for stability
  if (isPinchingNow) {
    consecutivePinchFrames++;
    if (consecutivePinchFrames >= REQUIRED_PINCH_FRAMES) {
      isPinchingState = true;
    }
  } else {
    consecutivePinchFrames = 0;
    isPinchingState = false;
  }

  // Calculate pinch position (midpoint between thumb and index)
  const position = {
    x: (thumbTip.x + indexTip.x) / 2,
    y: (thumbTip.y + indexTip.y) / 2,
  };

  return {
    isPinching: isPinchingState,
    position,
    pinchDistance: distance,
  };
}

export function stopHandpose(): void {
  if (handpose) {
    // @ts-expect-error - ml5 types are incomplete
    handpose.detectStop();
    handpose = null;
  }
  predictions = [];
  video = null;
}

