// Face tracking using ml5.js facemesh for smile detection

let facemesh: ReturnType<typeof import("ml5").faceMesh> | null = null;
let predictions: FacePrediction[] = [];
let video: HTMLVideoElement | null = null;

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
}

interface FacePrediction {
  keypoints: Keypoint[];
  box?: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
}

export interface FaceState {
  isSmiling: boolean;
  mouthOpenness: number;
  mouthWidth?: number;
}

// Smile detection thresholds
const MOUTH_OPEN_THRESHOLD = 0.08; // Ratio of mouth height to face height
const MOUTH_WIDTH_THRESHOLD = 0.35; // Ratio of mouth width to face width
const SMILE_FRAMES_REQUIRED = 5; // Require N consecutive frames to confirm smile

let consecutiveSmileFrames = 0;
let isSmiling = false;

// FaceMesh landmark indices for mouth
// Using MediaPipe facemesh landmark indices
const UPPER_LIP_TOP = 13; // Upper lip top center
const LOWER_LIP_BOTTOM = 14; // Lower lip bottom center
const MOUTH_LEFT = 61; // Left corner of mouth
const MOUTH_RIGHT = 291; // Right corner of mouth
const NOSE_TIP = 1; // Nose tip (for face height reference)
const FOREHEAD = 10; // Top of face
const CHIN = 152; // Bottom of face

export async function initFacemesh(videoElement: HTMLVideoElement): Promise<void> {
  video = videoElement;

  return new Promise((resolve, reject) => {
    const loadMl5 = async () => {
      try {
        const ml5 = await import("ml5");

        // @ts-expect-error - ml5 types are incomplete
        facemesh = ml5.faceMesh(video, { maxFaces: 1, flipHorizontal: false }, () => {
          console.log("Facemesh model loaded");

          // Start detection
          // @ts-expect-error - ml5 types are incomplete
          facemesh.detectStart(video, (results: FacePrediction[]) => {
            predictions = results || [];
          });

          resolve();
        });
      } catch (err) {
        console.error("Failed to load facemesh:", err);
        reject(err);
      }
    };

    loadMl5();
  });
}

export function getFaceState(): FaceState {
  if (predictions.length === 0) {
    consecutiveSmileFrames = 0;
    isSmiling = false;
    return { isSmiling: false, mouthOpenness: 0 };
  }

  const face = predictions[0];
  const keypoints = face.keypoints;

  if (keypoints.length < 400) {
    // Not enough landmarks
    return { isSmiling: false, mouthOpenness: 0 };
  }

  // Get mouth landmarks
  const upperLip = keypoints[UPPER_LIP_TOP];
  const lowerLip = keypoints[LOWER_LIP_BOTTOM];
  const mouthLeft = keypoints[MOUTH_LEFT];
  const mouthRight = keypoints[MOUTH_RIGHT];
  const forehead = keypoints[FOREHEAD];
  const chin = keypoints[CHIN];

  if (!upperLip || !lowerLip || !mouthLeft || !mouthRight || !forehead || !chin) {
    return { isSmiling: false, mouthOpenness: 0 };
  }

  // Calculate face height
  const faceHeight = Math.abs(chin.y - forehead.y);
  
  // Calculate mouth openness (vertical distance)
  const mouthHeight = Math.abs(lowerLip.y - upperLip.y);
  const mouthOpenness = faceHeight > 0 ? mouthHeight / faceHeight : 0;

  // Calculate mouth width
  const mouthWidth = Math.abs(mouthRight.x - mouthLeft.x);
  const faceWidth = faceHeight * 0.8; // Approximate face width
  const mouthWidthRatio = faceWidth > 0 ? mouthWidth / faceWidth : 0;

  // Smile detection heuristic:
  // - Mouth is open (showing teeth)
  // - Mouth is wide (corners pulled up/out)
  const isSmilingNow =
    mouthOpenness > MOUTH_OPEN_THRESHOLD && mouthWidthRatio > MOUTH_WIDTH_THRESHOLD;

  // Require consecutive frames for stability
  if (isSmilingNow) {
    consecutiveSmileFrames++;
    if (consecutiveSmileFrames >= SMILE_FRAMES_REQUIRED) {
      isSmiling = true;
    }
  } else {
    consecutiveSmileFrames = Math.max(0, consecutiveSmileFrames - 1);
    if (consecutiveSmileFrames === 0) {
      isSmiling = false;
    }
  }

  return {
    isSmiling,
    mouthOpenness,
    mouthWidth: mouthWidthRatio,
  };
}

export function stopFacemesh(): void {
  if (facemesh) {
    // @ts-expect-error - ml5 types are incomplete
    facemesh.detectStop();
    facemesh = null;
  }
  predictions = [];
  video = null;
}

