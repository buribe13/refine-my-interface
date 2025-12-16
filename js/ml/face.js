/**
 * Face Tracking Module (ml5.js faceMesh)
 * Detects smile-with-teeth for auto capture trigger
 */

(function() {
  'use strict';
  
  // Module state
  let facemesh = null;
  let predictions = [];
  let videoElement = null;
  let isReady = false;

  // Smile detection state
  let isSmiling = false;
  let consecutiveSmileFrames = 0;

  // FaceMesh landmark indices (MediaPipe)
  const LANDMARKS = {
    UPPER_LIP_TOP: 13,
    LOWER_LIP_BOTTOM: 14,
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,
    FOREHEAD: 10,
    CHIN: 152
  };

  // Configuration
  const CONFIG = {
    MOUTH_OPEN_THRESHOLD: 0.08,   // Ratio of mouth height to face height
    MOUTH_WIDTH_THRESHOLD: 0.35,  // Ratio of mouth width to face width
    REQUIRED_FRAMES: 5,           // Consecutive frames to confirm smile
    MAX_FACES: 1
  };

  /**
   * Initialize facemesh model
   * @param {HTMLVideoElement} video - Video element to track
   * @returns {Promise<void>}
   */
  async function initFacemesh(video) {
    videoElement = video;
    
    return new Promise((resolve, reject) => {
      try {
        console.log('[Face] Initializing facemesh...');
        
        facemesh = ml5.faceMesh(videoElement, { maxFaces: CONFIG.MAX_FACES, flipHorizontal: false }, () => {
          console.log('[Face] Model loaded');
          
          // Start continuous detection
          facemesh.detectStart(videoElement, (results) => {
            predictions = results || [];
          });
          
          isReady = true;
          resolve();
        });
      } catch (err) {
        console.error('[Face] Failed to initialize:', err);
        reject(err);
      }
    });
  }

  /**
   * Get current face state
   * @returns {{ isSmiling: boolean, mouthOpenness: number, mouthWidth: number | undefined }}
   */
  function getFaceState() {
    if (!isReady || predictions.length === 0) {
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
    const upperLip = keypoints[LANDMARKS.UPPER_LIP_TOP];
    const lowerLip = keypoints[LANDMARKS.LOWER_LIP_BOTTOM];
    const mouthLeft = keypoints[LANDMARKS.MOUTH_LEFT];
    const mouthRight = keypoints[LANDMARKS.MOUTH_RIGHT];
    const forehead = keypoints[LANDMARKS.FOREHEAD];
    const chin = keypoints[LANDMARKS.CHIN];
    
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
      mouthOpenness > CONFIG.MOUTH_OPEN_THRESHOLD && 
      mouthWidthRatio > CONFIG.MOUTH_WIDTH_THRESHOLD;
    
    // Require consecutive frames for stability
    if (isSmilingNow) {
      consecutiveSmileFrames++;
      if (consecutiveSmileFrames >= CONFIG.REQUIRED_FRAMES) {
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
      mouthWidth: mouthWidthRatio
    };
  }

  /**
   * Check if face tracking is ready
   * @returns {boolean}
   */
  function isFaceReady() {
    return isReady;
  }

  /**
   * Stop face tracking
   */
  function stopFacemesh() {
    if (facemesh) {
      facemesh.detectStop();
      facemesh = null;
    }
    predictions = [];
    videoElement = null;
    isReady = false;
  }

  // Export functions to global scope
  window.FaceTracker = {
    init: initFacemesh,
    getState: getFaceState,
    isReady: isFaceReady,
    stop: stopFacemesh
  };
})();
