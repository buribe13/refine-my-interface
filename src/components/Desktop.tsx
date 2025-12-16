"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Window from "./Window";
import PhotoBoothApp from "./PhotoBoothApp";

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Desktop() {
  console.warn("[Desktop] Component rendering");

  const [windowState, setWindowState] = useState<WindowState>({
    x: 100,
    y: 60,
    width: 640,
    height: 520,
  });

  const [currentTime, setCurrentTime] = useState("");

  // Ref to track pinch-drag from ml5
  const pinchDragRef = useRef<{
    onPinchMove: (x: number, y: number) => void;
    onPinchStart: (x: number, y: number) => void;
    onPinchEnd: () => void;
  } | null>(null);

  // Update time every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      const minuteStr = minutes.toString().padStart(2, "0");
      setCurrentTime(`${hour12}:${minuteStr} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Center window on mount
  useEffect(() => {
    const centerX = Math.max(50, (window.innerWidth - windowState.width) / 2);
    const centerY = Math.max(40, (window.innerHeight - windowState.height) / 2);
    setWindowState((prev) => ({
      ...prev,
      x: centerX,
      y: centerY,
    }));
  }, []);

  const handleWindowMove = useCallback((x: number, y: number) => {
    setWindowState((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(x, window.innerWidth - 100)),
      y: Math.max(20, Math.min(y, window.innerHeight - 50)),
    }));
  }, []);

  // Expose pinch handlers for the PhotoBoothApp to call
  const handlePinchStart = useCallback(
    (pinchX: number, pinchY: number) => {
      // Convert pinch position (from video coords) to screen coords
      // Check if pinch is over the title bar area
      const titleBarTop = windowState.y;
      const titleBarBottom = windowState.y + 22;
      const windowLeft = windowState.x;
      const windowRight = windowState.x + windowState.width;

      if (
        pinchX >= windowLeft &&
        pinchX <= windowRight &&
        pinchY >= titleBarTop &&
        pinchY <= titleBarBottom
      ) {
        pinchDragRef.current = {
          onPinchMove: (newX: number, newY: number) => {
            handleWindowMove(
              windowState.x + (newX - pinchX),
              windowState.y + (newY - pinchY)
            );
          },
          onPinchStart: () => {},
          onPinchEnd: () => {
            pinchDragRef.current = null;
          },
        };
      }
    },
    [windowState, handleWindowMove]
  );

  return (
    <div className="os9-desktop">
      {/* OS9 Menu Bar */}
      <div className="os9-menubar">
        <div className="os9-menubar-apple">🍎</div>
        <div className="os9-menubar-item">File</div>
        <div className="os9-menubar-item">Edit</div>
        <div className="os9-menubar-item">View</div>
        <div className="os9-menubar-item">Special</div>
        <div className="os9-menubar-item">Help</div>
        <div style={{ flex: 1 }} />
        <div className="os9-menubar-item">{currentTime}</div>
      </div>

      {/* Photo Booth Window */}
      <Window
        title="Photo Booth"
        x={windowState.x}
        y={windowState.y}
        width={windowState.width}
        height={windowState.height}
        onMove={handleWindowMove}
        pinchDragRef={pinchDragRef}
      >
        <PhotoBoothApp
          windowX={windowState.x}
          windowY={windowState.y}
          windowWidth={windowState.width}
          onPinchStart={handlePinchStart}
          pinchDragRef={pinchDragRef}
        />
      </Window>
    </div>
  );
}
