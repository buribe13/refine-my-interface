/**
 * Hand Tracking Module (ml5.js handPose)
 * Detects pinch gestures for window dragging
 */

(function() {
  'use strict';
  
  // Module state
  let handpose = null;
  let predictions = [];
  let videoElement = null;
  let isReady = false;

  // Pinch detection state
  let isPinchingState = false;
  let consecutivePinchFrames = 0;

  // Configuration
  const CONFIG = {
    PINCH_THRESHOLD: 40,      // Distance in pixels between thumb and index tip
    PINCH_HYSTERESIS: 10,     // Hysteresis to prevent flickering
    REQUIRED_FRAMES: 3,       // Consecutive frames to confirm pinch
    MAX_HANDS: 1
  };

  /**
   * Initialize handpose model
   * @param {HTMLVideoElement} video - Video element to track
   * @returns {Promise<void>}
   */
  async function initHandpose(video) {
    videoElement = video;
    
    return new Promise((resolve, reject) => {
      try {
        console.log('[Hand] Initializing handpose...');
        
        handpose = ml5.handPose(videoElement, { maxHands: CONFIG.MAX_HANDS, flipHorizontal: false }, () => {
          console.log('[Hand] Model loaded');
          
          // Start continuous detection
          handpose.detectStart(videoElement, (results) => {
            predictions = results || [];
          });
          
          isReady = true;
          resolve();
        });
      } catch (err) {
        console.error('[Hand] Failed to initialize:', err);
        reject(err);
      }
    });
  }

  /**
   * Get current hand state
   * @returns {{ isPinching: boolean, position: { x: number, y: number } | null, pinchDistance: number | undefined }}
   */
  function getHandState() {
    if (!isReady || predictions.length === 0) {
      isPinchingState = false;
      consecutivePinchFrames = 0;
      return { isPinching: false, position: null };
    }
    
    const hand = predictions[0];
    const keypoints = hand.keypoints;
    
    // Find thumb tip and index finger tip
    const thumbTip = keypoints.find(k => k.name === 'thumb_tip');
    const indexTip = keypoints.find(k => k.name === 'index_finger_tip');
    
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
      ? CONFIG.PINCH_THRESHOLD + CONFIG.PINCH_HYSTERESIS 
      : CONFIG.PINCH_THRESHOLD;
    
    const isPinchingNow = distance < threshold;
    
    // Require consecutive frames for stability
    if (isPinchingNow) {
      consecutivePinchFrames++;
      if (consecutivePinchFrames >= CONFIG.REQUIRED_FRAMES) {
        isPinchingState = true;
      }
    } else {
      consecutivePinchFrames = 0;
      isPinchingState = false;
    }
    
    // Calculate pinch position (midpoint between thumb and index)
    const position = {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2
    };
    
    return {
      isPinching: isPinchingState,
      position,
      pinchDistance: distance
    };
  }

  /**
   * Check if hand tracking is ready
   * @returns {boolean}
   */
  function isHandReady() {
    return isReady;
  }

  /**
   * Stop hand tracking
   */
  function stopHandpose() {
    if (handpose) {
      handpose.detectStop();
      handpose = null;
    }
    predictions = [];
    videoElement = null;
    isReady = false;
  }

  // Export functions to global scope
  window.HandTracker = {
    init: initHandpose,
    getState: getHandState,
    isReady: isHandReady,
    stop: stopHandpose
  };
})();
