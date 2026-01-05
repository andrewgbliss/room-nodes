'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Room, Door } from '@/types/room';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface RoomCanvasProps {
  rooms: Room[];
  doors: Door[];
  onRoomsChange: (rooms: Room[]) => void;
  onDoorsChange: (doors: Door[]) => void;
  selectedRoomId: string | null;
  onRoomSelect: (roomId: string | null) => void;
  isConnectingMode: boolean;
  onConnectionCancel: () => void;
}

const ROOM_WIDTH = 150;
const ROOM_HEIGHT = 100;

export default function RoomCanvas({
  rooms,
  doors,
  onRoomsChange,
  onDoorsChange,
  selectedRoomId,
  onRoomSelect,
  isConnectingMode,
  onConnectionCancel,
}: RoomCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragRoomId, setDragRoomId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{ roomId: string; side: 'top' | 'right' | 'bottom' | 'left'; position: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const getSidePoint = useCallback((room: Room, side: 'top' | 'right' | 'bottom' | 'left', position: number) => {
    switch (side) {
      case 'top':
        return {
          x: room.x + room.width * position,
          y: room.y,
        };
      case 'right':
        return {
          x: room.x + room.width,
          y: room.y + room.height * position,
        };
      case 'bottom':
        return {
          x: room.x + room.width * position,
          y: room.y + room.height,
        };
      case 'left':
        return {
          x: room.x,
          y: room.y + room.height * position,
        };
    }
  }, []);

  const getSideFromPoint = useCallback((room: Room, x: number, y: number, zoom: number): { side: 'top' | 'right' | 'bottom' | 'left'; position: number } | null => {
    const margin = 15 / zoom;
    
    // Check if point is near top edge
    if (Math.abs(y - room.y) < margin && x >= room.x && x <= room.x + room.width) {
      return { side: 'top', position: Math.max(0, Math.min(1, (x - room.x) / room.width)) };
    }
    // Check if point is near right edge
    if (Math.abs(x - (room.x + room.width)) < margin && y >= room.y && y <= room.y + room.height) {
      return { side: 'right', position: Math.max(0, Math.min(1, (y - room.y) / room.height)) };
    }
    // Check if point is near bottom edge
    if (Math.abs(y - (room.y + room.height)) < margin && x >= room.x && x <= room.x + room.width) {
      return { side: 'bottom', position: Math.max(0, Math.min(1, (x - room.x) / room.width)) };
    }
    // Check if point is near left edge
    if (Math.abs(x - room.x) < margin && y >= room.y && y <= room.y + room.height) {
      return { side: 'left', position: Math.max(0, Math.min(1, (y - room.y) / room.height)) };
    }
    
    return null;
  }, []);

  const drawRoom = useCallback((ctx: CanvasRenderingContext2D, room: Room, isSelected: boolean, zoom: number) => {
    // Draw room rectangle
    ctx.fillStyle = isSelected ? '#dbeafe' : '#f3f4f6';
    ctx.strokeStyle = isSelected ? '#2563eb' : '#9ca3af';
    ctx.lineWidth = (isSelected ? 3 : 2) / zoom;
    
    ctx.fillRect(room.x, room.y, room.width, room.height);
    ctx.strokeRect(room.x, room.y, room.width, room.height);
    
    // Since ctx.scale(zoom, zoom) is applied, text will automatically scale.
    // Use constant font sizes so text scales proportionally with zoom
    const nameFontSize = 14;
    const idFontSize = 11;
    
    // Draw room name
    ctx.fillStyle = '#1f2937';
    ctx.font = `bold ${nameFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(room.name, room.x + room.width / 2, room.y + room.height / 2 - 10);
    
    // Draw room ID
    ctx.fillStyle = '#6b7280';
    ctx.font = `${idFontSize}px sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.fillText(`ID: ${room.id}`, room.x + room.width / 2, room.y + room.height - 8);
  }, []);

  const drawDoor = useCallback((ctx: CanvasRenderingContext2D, door: Door, zoom: number) => {
    const room1 = rooms.find(r => r.id === door.roomId1);
    const room2 = rooms.find(r => r.id === door.roomId2);
    
    if (!room1 || !room2) return;
    
    const point1 = getSidePoint(room1, door.side1, 0.5);
    const point2 = getSidePoint(room2, door.side2, 0.5);
    
    // Draw door line
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3 / zoom;
    ctx.beginPath();
    ctx.moveTo(point1.x, point1.y);
    ctx.lineTo(point2.x, point2.y);
    ctx.stroke();
    
    // Draw door indicators on both sides
    ctx.fillStyle = '#f59e0b';
    const doorSize = 10 / zoom;
    ctx.fillRect(point1.x - doorSize / 2, point1.y - doorSize / 2, doorSize, doorSize);
    ctx.fillRect(point2.x - doorSize / 2, point2.y - doorSize / 2, doorSize, doorSize);
    
    // Draw door outline
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(point1.x - doorSize / 2, point1.y - doorSize / 2, doorSize, doorSize);
    ctx.strokeRect(point2.x - doorSize / 2, point2.y - doorSize / 2, doorSize, doorSize);
  }, [rooms, getSidePoint]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and pan transformation
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw grid
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1 / zoom;
    const gridSize = 50;
    const startX = Math.floor((-pan.x) / zoom / gridSize) * gridSize;
    const startY = Math.floor((-pan.y) / zoom / gridSize) * gridSize;
    const endX = Math.ceil((canvas.width - pan.x) / zoom / gridSize) * gridSize;
    const endY = Math.ceil((canvas.height - pan.y) / zoom / gridSize) * gridSize;
    
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
    
    // Draw doors (behind rooms)
    doors.forEach(door => drawDoor(ctx, door, zoom));
    
    // Draw rooms
    rooms.forEach(room => {
      drawRoom(ctx, room, room.id === selectedRoomId, zoom);
    });
    
    // Draw connecting line if in connection mode
    if (isConnectingMode && connectingFrom) {
      const room = rooms.find(r => r.id === connectingFrom.roomId);
      if (room) {
        const fromPoint = getSidePoint(room, connectingFrom.side, connectingFrom.position);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.moveTo(fromPoint.x, fromPoint.y);
        const canvasMouseX = (mousePos.x - pan.x) / zoom;
        const canvasMouseY = (mousePos.y - pan.y) / zoom;
        ctx.lineTo(canvasMouseX, canvasMouseY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    
    ctx.restore();
  }, [rooms, doors, selectedRoomId, isConnectingMode, connectingFrom, mousePos, drawRoom, drawDoor, getSidePoint, zoom, pan]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const displayX = (e.clientX - rect.left) * scaleX;
    const displayY = (e.clientY - rect.top) * scaleY;
    const x = (displayX - pan.x) / zoom;
    const y = (displayY - pan.y) / zoom;
    
    // Middle mouse button or shift+click for panning
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      setIsPanning(true);
      setPanStart({ x: displayX - pan.x, y: displayY - pan.y });
      e.preventDefault();
      return;
    }
    
    // Check if clicking on a room
    const clickedRoom = rooms.find(room => 
      x >= room.x && x <= room.x + room.width &&
      y >= room.y && y <= room.y + room.height
    );
    
    if (clickedRoom) {
      if (isConnectingMode && connectingFrom) {
        // Try to connect to this room
        const sideInfo = getSideFromPoint(clickedRoom, x, y, zoom);
        if (sideInfo && clickedRoom.id !== connectingFrom.roomId) {
          // Create door
          const newDoor: Door = {
            id: `door-${Date.now()}`,
            roomId1: connectingFrom.roomId,
            roomId2: clickedRoom.id,
            side1: connectingFrom.side,
            side2: sideInfo.side,
          };
          onDoorsChange([...doors, newDoor]);
          setConnectingFrom(null);
          onConnectionCancel();
        }
      } else if (isConnectingMode && !connectingFrom) {
        // Start connection from this room
        const sideInfo = getSideFromPoint(clickedRoom, x, y, zoom);
        if (sideInfo) {
          setConnectingFrom({ roomId: clickedRoom.id, side: sideInfo.side, position: sideInfo.position });
        }
      } else {
        // Select and start dragging
        onRoomSelect(clickedRoom.id);
        setIsDragging(true);
        setDragRoomId(clickedRoom.id);
        setDragOffset({
          x: x - clickedRoom.x,
          y: y - clickedRoom.y,
        });
      }
    } else {
      if (!isConnectingMode) {
        onRoomSelect(null);
        // Start panning when clicking on empty space
        setIsPanning(true);
        setPanStart({ x: displayX - pan.x, y: displayY - pan.y });
      }
    }
  }, [rooms, isConnectingMode, connectingFrom, getSideFromPoint, onDoorsChange, doors, onRoomSelect, onConnectionCancel, zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const displayX = (e.clientX - rect.left) * scaleX;
    const displayY = (e.clientY - rect.top) * scaleY;
    setMousePos({ x: displayX, y: displayY });
    
    if (isPanning) {
      setPan({
        x: displayX - panStart.x,
        y: displayY - panStart.y,
      });
      return;
    }
    
    if (isDragging && dragRoomId) {
      const room = rooms.find(r => r.id === dragRoomId);
      if (room) {
        const canvasX = (displayX - pan.x) / zoom;
        const canvasY = (displayY - pan.y) / zoom;
        const newX = canvasX - dragOffset.x;
        const newY = canvasY - dragOffset.y;
        
        const updatedRooms = rooms.map(r =>
          r.id === dragRoomId ? { ...r, x: newX, y: newY } : r
        );
        onRoomsChange(updatedRooms);
      }
    }
  }, [isDragging, dragRoomId, dragOffset, rooms, onRoomsChange, isPanning, panStart, pan, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragRoomId(null);
    setIsPanning(false);
  }, []);
  
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    
    // Zoom towards mouse position
    const zoomFactor = newZoom / zoom;
    setPan({
      x: mouseX - (mouseX - pan.x) * zoomFactor,
      y: mouseY - (mouseY - pan.y) * zoomFactor,
    });
    setZoom(newZoom);
  }, [zoom, pan]);
  
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(5, prev * 1.2));
  }, []);
  
  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.1, prev / 1.2));
  }, []);
  
  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleFitToScreen = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || rooms.length === 0) return;

    // Calculate bounding box of all rooms
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    rooms.forEach(room => {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Add padding (20% on each side)
    const padding = 0.2;
    const paddedWidth = contentWidth * (1 + padding * 2);
    const paddedHeight = contentHeight * (1 + padding * 2);

    // Calculate zoom to fit content
    const zoomX = canvas.width / paddedWidth;
    const zoomY = canvas.height / paddedHeight;
    const newZoom = Math.min(zoomX, zoomY, 5); // Limit max zoom to 5

    // Center the content
    const newPanX = canvas.width / 2 - centerX * newZoom;
    const newPanY = canvas.height / 2 - centerY * newZoom;

    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [rooms]);

  useEffect(() => {
    if (!isConnectingMode) {
      setConnectingFrom(null);
    }
  }, [isConnectingMode]);

  return (
    <div className="w-full h-full relative border border-gray-300 rounded overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-2 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-2">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-secondary rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-secondary rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-secondary rounded transition-colors"
          title="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 hover:bg-secondary rounded transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="text-xs text-center text-muted-foreground px-2 py-1">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      <div className="w-full h-full overflow-auto">
        <canvas
          ref={canvasRef}
          width={1200}
          height={800}
          className="cursor-crosshair block"
          style={{ cursor: isConnectingMode ? 'crosshair' : isDragging ? 'grabbing' : isPanning ? 'grabbing' : 'grab', display: 'block' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
      </div>
    </div>
  );
}
