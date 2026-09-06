import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, Crop, Maximize2, Minimize2 } from "lucide-react";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
  isLightMode?: boolean;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  isOpen,
  imageSrc,
  onCropComplete,
  onCancel,
  isLightMode = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialTouchDistance, setInitialTouchDistance] = useState<number | null>(null);
  const [initialTouchZoom, setInitialTouchZoom] = useState(1);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize dimensions and initial zoom when image changes
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      // Calculate min zoom to cover a square crop area (1:1)
      const aspect = img.naturalWidth / img.naturalHeight;
      let initialScale = 1;
      if (aspect < 1) {
        // Tall image: scale width to fit square
        initialScale = 1;
      } else {
        // Wide image: scale height to fit square
        initialScale = 1;
      }
      setMinZoom(0.5);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Handle Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Touch drag and pinch-to-zoom
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y });
      setInitialTouchDistance(null);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const dist = getTouchDistance(e.touches);
      if (dist) {
        setInitialTouchDistance(dist);
        setInitialTouchZoom(zoom);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      setOffset({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && initialTouchDistance !== null) {
      const currentDist = getTouchDistance(e.touches);
      if (currentDist) {
        const factor = currentDist / initialTouchDistance;
        const newZoom = Math.min(Math.max(initialTouchZoom * factor, 0.5), 4);
        setZoom(newZoom);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setInitialTouchDistance(null);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(Math.max(prev + zoomDelta, 0.5), 4));
  };

  // Quick fit / fill
  const handleFit = () => {
    if (!naturalDimensions.width || !naturalDimensions.height) return;
    const isLandscape = naturalDimensions.width > naturalDimensions.height;
    setZoom(isLandscape ? 1 : 1);
    setOffset({ x: 0, y: 0 });
  };

  const handleFill = () => {
    if (!naturalDimensions.width || !naturalDimensions.height) return;
    const aspect = naturalDimensions.width / naturalDimensions.height;
    const fillScale = aspect > 1 ? aspect : 1 / aspect;
    setZoom(fillScale);
    setOffset({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Render high-res 1080x1080 1:1 canvas for YouTube
  const handleApplyCrop = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) {
      onCancel();
      return;
    }

    const outputSize = 1080; // High resolution 1080x1080 for YouTube playlist cover
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onCancel();
      return;
    }

    // Fill background with black in case of non-filled boundaries
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, outputSize, outputSize);

    // Save context for transformations
    ctx.save();

    // Move to center of canvas
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate crop box scale relative to canvas
    const boxRect = container.getBoundingClientRect();
    const boxSize = boxRect.width; // square box
    const scaleFactor = outputSize / boxSize;

    // Apply offset and zoom
    const transX = offset.x * scaleFactor;
    const transY = offset.y * scaleFactor;

    // Determine displayed image dimensions within box
    const imgAspect = naturalDimensions.width / naturalDimensions.height;
    let baseDisplayWidth = boxSize;
    let baseDisplayHeight = boxSize;

    if (imgAspect >= 1) {
      baseDisplayHeight = boxSize;
      baseDisplayWidth = boxSize * imgAspect;
    } else {
      baseDisplayWidth = boxSize;
      baseDisplayHeight = boxSize / imgAspect;
    }

    const drawWidth = baseDisplayWidth * scaleFactor * zoom;
    const drawHeight = baseDisplayHeight * scaleFactor * zoom;

    // Draw image centered with offset
    ctx.drawImage(
      img,
      transX - drawWidth / 2,
      transY - drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // Export as high quality JPEG (under 400KB for rapid YouTube sync)
    const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    onCropComplete(croppedDataUrl);
  }, [offset, zoom, rotation, naturalDimensions, onCropComplete, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in select-none">
      <div
        className={`w-full max-w-lg ${
          isLightMode ? "bg-[#f5f2eb] text-[#1c1917] border-[#e2dcd0]" : "bg-slate-900 text-white border-slate-800"
        } border rounded-3xl shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-[var(--accent-color,var(--primary))]" />
            <div>
              <h3 className="text-base font-bold">Crop & Position for YouTube</h3>
              <p className="text-[11px] opacity-70">YouTube requires 1:1 square playlist artwork</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-5 flex flex-col items-center justify-center">
          {/* 1:1 Square Crop Frame with Visual Guides */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-2xl overflow-hidden bg-black cursor-grab active:cursor-grabbing border-2 border-[var(--accent-color,var(--primary))] shadow-inner flex items-center justify-center touch-none"
          >
            {/* The Image to be adjusted */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              crossOrigin="anonymous"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
                maxWidth: "100%",
                maxHeight: "100%",
                pointerEvents: "none",
                userSelect: "none",
              }}
              className="transition-transform duration-75"
            />

            {/* Grid Guides Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/20 grid grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/10" />
              <div className="border-r border-b border-white/10" />
              <div className="border-b border-white/10" />
              <div className="border-r border-b border-white/10" />
              <div className="border-r border-b border-white/10" />
              <div className="border-b border-white/10" />
              <div className="border-r border-white/10" />
              <div className="border-r border-white/10" />
              <div />
            </div>

            {/* Subtle drag hint */}
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white/80 pointer-events-none flex items-center gap-1">
              <Move className="w-3 h-3" />
              Drag to position / Pinch to zoom
            </div>
          </div>

          {/* Controls Bar */}
          <div className="w-full mt-4 space-y-3">
            {/* Zoom Slider and + / - */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(prev - 0.15, 0.5))}
                className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-[var(--accent-color,var(--primary))] h-1.5 rounded-lg cursor-pointer bg-black/15 dark:bg-white/15"
              />

              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(prev + 0.15, 3))}
                className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <span className="text-xs font-mono w-10 text-right opacity-80">{Math.round(zoom * 100)}%</span>
            </div>

            {/* Action Tools */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleFit}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors flex items-center gap-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  Fit
                </button>
                <button
                  type="button"
                  onClick={handleFill}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Fill
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors flex items-center gap-1"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotate
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                  setRotation(0);
                }}
                className="text-xs text-[var(--accent-color,var(--primary))] hover:underline"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/20">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--accent-color,var(--primary))] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Apply Artwork
          </button>
        </div>
      </div>
    </div>
  );
};
