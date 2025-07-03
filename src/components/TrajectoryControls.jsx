import React, { useEffect, useMemo } from 'react';
import { Play, Pause, RotateCcw, Save, Download } from 'lucide-react';

const TrajectoryControls = ({
  trajectory,
  isPlaying,
  setIsPlaying,
  currentPoint,
  setCurrentPoint,
  onSave
}) => {
  // ✅ Calculate accurate trajectory statistics
  const trajectoryStats = useMemo(() => {
    if (!trajectory || trajectory.length === 0) {
      return { totalDistance: 0, totalTime: 0, averageSpeed: 0, workingTime: 0, workingEfficiency: 0 };
    }

    let totalDistance = 0;
    let totalTime = 0;
    let workingTime = 0;

    for (let i = 1; i < trajectory.length; i++) {
      const prevPoint = trajectory[i - 1];
      const currentPoint = trajectory[i];

      // Calculate distance between consecutive points
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - prevPoint.x, 2) +
        Math.pow(currentPoint.y - prevPoint.y, 2)
      );

      // Calculate time for this segment (Time = Distance / Speed)
      const speed = currentPoint.speed || 0.1; // Fallback speed
      const segmentTime = distance / speed;

      totalDistance += distance;
      totalTime += segmentTime;

      // Track working time
      if (currentPoint.tool_active) {
        workingTime += segmentTime;
      }
    }

    const averageSpeed = totalDistance > 0 ? totalDistance / totalTime : 0;

    return {
      totalDistance,
      totalTime,
      averageSpeed,
      workingTime,
      workingEfficiency: totalTime > 0 ? (workingTime / totalTime) * 100 : 0
    };
  }, [trajectory]);

  useEffect(() => {
    let interval;
    if (isPlaying && currentPoint < trajectory.length - 1) {
      interval = setInterval(() => {
        setCurrentPoint(prev => {
          if (prev >= trajectory.length - 1) {
            setIsPlaying(false);
            return trajectory.length - 1;
          }

          // ✅ Round to next integer point for safety
          return Math.min(Math.floor(prev) + 1, trajectory.length - 1);
        });
      }, 100); // Slower but stable
    }
    return () => clearInterval(interval);
  }, [isPlaying, trajectory.length]);


  const handlePlayPause = () => {
    if (trajectory.length === 0) return;
    if (currentPoint >= trajectory.length - 1) {
      setCurrentPoint(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentPoint(0);
  };

  const handleProgressChange = (e) => {
    const progress = parseFloat(e.target.value);
    const newPoint = Math.floor((progress / 100) * (trajectory.length - 1));
    setCurrentPoint(newPoint);
  };

  const progress = trajectory.length > 0 ? (currentPoint / (trajectory.length - 1)) * 100 : 0;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 w-full">
      <div className="flex items-center space-x-3 mb-6">
        <Play className="w-5 h-5 text-green-400" />
        <h2 className="text-xl font-semibold text-white">Trajectory Playback</h2>
      </div>


      {/* Rest of the component remains the same... */}
      <div className="space-y-4 mt-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Progress</span>
            <span>{currentPoint + 1} / {trajectory.length || 0}</span>
          </div>
          <div className="relative">
            {/* Background track */}
            <div className="w-full h-2 bg-gray-700 rounded-lg"></div>

            {/* Progress fill - positioned absolutely behind the slider */}
            <div
              className="absolute top-0 left-0 h-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg pointer-events-none z-10"
              style={{ width: `${progress}%` }}
            />

            {/* Input slider - positioned absolutely on top */}
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={handleProgressChange}
              disabled={trajectory.length === 0}
              className="absolute top-0 left-0 w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-20 slider"
            />
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePlayPause}
            disabled={trajectory.length === 0}
            className="flex items-center justify-center w-12 h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={handleReset}
            disabled={trajectory.length === 0}
            className="flex items-center justify-center w-12 h-12 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <button
            onClick={onSave}
            disabled={trajectory.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
      {/* ✅ Accurate Statistics */}
      <div className="bg-gray-900/50 rounded-lg p-4 mt-4">
        <h3 className="text-sm text-gray-300 font-semibold mb-3">Trajectory Stats:</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Points:</span>
            <span className="text-white">{trajectory.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Duration:</span>
            <span className="text-white">{trajectoryStats.totalTime.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Distance:</span>
            <span className="text-white">{trajectoryStats.totalDistance.toFixed(2)}m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Speed:</span>
            <span className="text-white">{trajectoryStats.averageSpeed.toFixed(2)} m/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Working Time:</span>
            <span className="text-green-400">{trajectoryStats.workingTime.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Efficiency:</span>
            <span className="text-blue-400">{trajectoryStats.workingEfficiency?.toFixed(1) || '0.0'}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrajectoryControls;