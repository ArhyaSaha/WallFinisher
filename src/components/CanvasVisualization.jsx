import React, { useRef, useEffect, useState } from 'react';

const CanvasVisualization = ({
  wallDimensions,
  obstacles,
  trajectory,
  currentPoint,
  onObstacleUpdate,
  toolConfig // Add this prop
}) => {
  const canvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(50); // pixels per meter

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Set canvas size
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Calculate scale to fit wall in canvas
    const padding = 40;
    const scaleX = (canvas.width - padding * 2) / wallDimensions.width;
    const scaleY = (canvas.height - padding * 2) / wallDimensions.height;
    const newScale = Math.min(scaleX, scaleY);
    setScale(newScale);

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height, newScale, padding);

    // Draw wall boundaries
    drawWall(ctx, wallDimensions, newScale, padding);

    // Draw trajectory BEFORE obstacles so obstacles appear on top
    if (trajectory.length > 0) {
      drawTrajectory(ctx, trajectory, newScale, padding, currentPoint);
    }

    // Draw obstacles ON TOP of trajectory lines
    obstacles.forEach(obstacle => {
      drawObstacle(ctx, obstacle, newScale, padding);
    });

    // Draw robot position (on top of everything)
    if (trajectory.length > 0 && currentPoint < trajectory.length) {
      drawRobot(ctx, trajectory[currentPoint], newScale, padding);
    }

  }, [wallDimensions, obstacles, trajectory, currentPoint]);

  const drawGrid = (ctx, width, height, scale, padding) => {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = padding; x < width - padding; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = padding; y < height - padding; y += scale) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
  };

  const drawWall = (ctx, dimensions, scale, padding) => {
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(padding, padding, dimensions.width * scale, dimensions.height * scale);
    ctx.stroke();

    // Wall label
    ctx.fillStyle = '#60a5fa';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(`Wall: ${dimensions.width}m × ${dimensions.height}m`, padding, padding - 10);
  };

  const drawObstacle = (ctx, obstacle, scale, padding) => {
    const x = padding + obstacle.x * scale;
    const y = padding + obstacle.y * scale;
    const width = obstacle.width * scale;
    const height = obstacle.height * scale;

    // Draw obstacle with semi-transparent background for better visibility
    ctx.fillStyle = obstacle.type === 'window' ? 'rgba(251, 191, 36, 0.9)' : 'rgba(239, 68, 68, 0.9)';
    ctx.fillRect(x, y, width, height);

    // Draw border
    ctx.strokeStyle = obstacle.type === 'window' ? '#f59e0b' : '#dc2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Draw label with background for better readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y + height + 2, 50, 12);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(obstacle.type, x + 2, y + height + 12);
  };

  const drawTrajectory = (ctx, points, scale, padding, currentIdx) => {
    if (points.length < 2) return;

    // Get actual tool width from props
    const toolWidthMeters = toolConfig?.tool_width || 0.1;
    const toolWidthPixels = toolWidthMeters * scale;
    const halfToolWidth = toolWidthPixels / 2;

    // Group consecutive points by tool_active status
    let segments = [];
    let currentSegment = [];
    let currentToolActive = null;

    for (let i = 0; i <= Math.min(currentIdx, points.length - 1); i++) {
      const point = points[i];
      const toolActive = point.tool_active !== undefined ? point.tool_active : true;

      if (currentToolActive !== toolActive && currentSegment.length > 0) {
        segments.push({ points: currentSegment, toolActive: currentToolActive });
        currentSegment = [point];
        currentToolActive = toolActive;
      } else {
        currentSegment.push(point);
        if (currentToolActive === null) currentToolActive = toolActive;
      }
    }

    // Add the last segment
    if (currentSegment.length > 0) {
      segments.push({ points: currentSegment, toolActive: currentToolActive });
    }

    // Draw each segment as thick continuous lines
    segments.forEach(segment => {
      if (segment.points.length < 1) return;

      // Set style based on tool_active status
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = toolWidthPixels; // Line width = tool width
      ctx.lineCap = 'butt'; // Round caps to avoid gaps
      ctx.lineJoin = 'miter'; // Round joins to avoid gaps

      if (segment.toolActive) {
        ctx.strokeStyle = '#10b981'; // Green for working
      } else {
        ctx.strokeStyle = '#FF4500'; // Orange for moving
        // Make it dashed for moving
        // ctx.setLineDash([toolWidthPixels * 0.8, toolWidthPixels * 0.4]);
      }

      ctx.beginPath();
      segment.points.forEach((point, index) => {
        let x = padding + point.x * scale;
        let y = padding + point.y * scale;

        x = Math.max(padding + halfToolWidth, Math.min(x, ctx.canvas.width - padding - halfToolWidth));

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      // ctx.globalCompositeOperation = 'source-over';
      ctx.stroke();

      // Reset dash pattern
      ctx.setLineDash([]);
    });

    // Draw remaining path (future points)
    if (currentIdx < points.length - 1) {
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.lineCap = 'round';
      ctx.beginPath();

      for (let i = currentIdx; i < points.length; i++) {
        const point = points[i];
        const x = padding + point.x * scale;
        const y = padding + point.y * scale;

        if (i === currentIdx) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawRobot = (ctx, position, scale, padding) => {
    const x = padding + position.x * scale;
    const y = padding + position.y * scale;
    const radius = 8;

    // Robot body with different color based on tool status
    const isToolActive = position.tool_active !== undefined ? position.tool_active : true;
    ctx.fillStyle = isToolActive ? '#3b82f6' : '#f97316'; // Blue when working, orange when moving
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Robot direction indicator
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(position.angle || 0) * radius, y + Math.sin(position.angle || 0) * radius);
    ctx.stroke();

    // Tool status indicator
    ctx.fillStyle = isToolActive ? '#10b981' : '#ef4444';
    ctx.beginPath();
    ctx.arc(x + 6, y - 6, 3, 0, 2 * Math.PI);
    ctx.fill();
  };

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on an obstacle
    const padding = 40;
    for (const obstacle of obstacles) {
      const obsX = padding + obstacle.x * scale;
      const obsY = padding + obstacle.y * scale;
      const obsWidth = obstacle.width * scale;
      const obsHeight = obstacle.height * scale;

      if (x >= obsX && x <= obsX + obsWidth && y >= obsY && y <= obsY + obsHeight) {
        setIsDragging(true);
        setDragTarget(obstacle);
        setDragOffset({ x: x - obsX, y: y - obsY });
        break;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !dragTarget) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padding = 40;
    const newX = Math.max(0, Math.min(wallDimensions.width - dragTarget.width, (x - dragOffset.x - padding) / scale));
    const newY = Math.max(0, Math.min(wallDimensions.height - dragTarget.height, (y - dragOffset.y - padding) / scale));

    onObstacleUpdate(dragTarget.id, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragTarget(null);
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-96 rounded-lg border border-gray-600 cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute top-2 right-2 bg-gray-900/80 rounded-lg px-3 py-2">
        <div className="text-xs text-gray-300 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Robot (Working)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded"></div>
            <span>Robot (Tool Inactive)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Working Path</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded" style={{ clipPath: 'polygon(0 0, 60% 0, 60% 100%, 0 100%)' }}></div>
            <span>Moving Path/Margin</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Window</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Obstacle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CanvasVisualization;