"use client";

import { useRef, useCallback, useState, useEffect, MutableRefObject } from "react";

interface WindowProps {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  onMove: (x: number, y: number) => void;
  children: React.ReactNode;
  pinchDragRef?: MutableRefObject<{
    onPinchMove: (x: number, y: number) => void;
    onPinchStart: (x: number, y: number) => void;
    onPinchEnd: () => void;
  } | null>;
}

export default function Window({
  title,
  x,
  y,
  width,
  height,
  onMove,
  children,
  pinchDragRef,
}: WindowProps) {
  const titleBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target !== titleBarRef.current && !titleBarRef.current?.contains(e.target as Node)) {
        return;
      }
      
      e.preventDefault();
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - x,
        y: e.clientY - y,
      };
    },
    [x, y]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      onMove(newX, newY);
    },
    [isDragging, onMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Listen for pinch drag updates
  useEffect(() => {
    if (!pinchDragRef) return;

    const checkPinchDrag = () => {
      if (pinchDragRef.current) {
        // Pinch drag is active, the PhotoBoothApp will call the move handler
      }
    };

    const interval = setInterval(checkPinchDrag, 16);
    return () => clearInterval(interval);
  }, [pinchDragRef]);

  return (
    <div
      className="aqua-window"
      style={{
        left: x,
        top: y,
        width,
        height,
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      <div
        ref={titleBarRef}
        className={`aqua-window-titlebar ${isDragging ? "active" : ""}`}
        onMouseDown={handleMouseDown}
      >
        <div className="aqua-window-controls">
          <button className="aqua-window-btn close" title="Close">
            <span className="btn-icon">×</span>
          </button>
          <button className="aqua-window-btn minimize" title="Minimize">
            <span className="btn-icon">−</span>
          </button>
          <button className="aqua-window-btn zoom" title="Zoom">
            <span className="btn-icon">+</span>
          </button>
        </div>
        <span className="aqua-window-title">{title}</span>
      </div>
      <div className="aqua-window-content">{children}</div>
    </div>
  );
}

