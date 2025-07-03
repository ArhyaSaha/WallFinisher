import React, { useState, useRef, useEffect } from 'react';
import { Settings, Play, Pause, RotateCcw, Plus, Trash2, Save, Download } from 'lucide-react';
import CanvasVisualization from './components/CanvasVisualization';
import ControlPanel from './components/ControlPanel';
import ObstacleManager from './components/ObstacleManager';
import TrajectoryControls from './components/TrajectoryControls';
import { API_BASE_URL } from './utils/api';
import SavedTrajectories from './components/SavedTrajectories';

function App() {
  const [wallDimensions, setWallDimensions] = useState({ width: 5, height: 5 });
  const [obstacles, setObstacles] = useState([
    { id: 1, x: 2, y: 2, width: 0.25, height: 0.25, type: 'window' }
  ]);
  const [trajectory, setTrajectory] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPoint, setCurrentPoint] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toolConfig, setToolConfig] = useState({
    tool_width: 0.1,      // 10cm default
    overlap: 0.02,        // 2cm default
    safety_margin: 0.05   // 5cm default
  });
  const [saved, setSaved] = useState(false)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), { message, type, timestamp }]);
  };

  const generateTrajectory = async () => {
    setIsGenerating(true);
    addLog('Starting trajectory generation...', 'info');

    try {
      const response = await fetch(`${API_BASE_URL}/generate_trajectory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wall_width: wallDimensions.width,
          wall_height: wallDimensions.height,
          obstacles: obstacles.map(obs => ({
            x: obs.x,
            y: obs.y,
            width: obs.width,
            height: obs.height
          })),
          tool_width: toolConfig.tool_width,      // Include tool config
          overlap: toolConfig.overlap,
          safety_margin: toolConfig.safety_margin
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTrajectory(data.trajectory);
        setCurrentPoint(0);
        addLog(`Trajectory generated with ${data.trajectory.length} points`, 'success');
      } else {
        addLog('Failed to generate trajectory', 'error');
      }
    } catch (error) {
      addLog(`Error: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveTrajectory = async () => {
    if (trajectory.length === 0) {
      addLog('No trajectory to save', 'warning');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/save_trajectory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wall_width: wallDimensions.width,
          wall_height: wallDimensions.height,
          obstacles: obstacles,
          trajectory: trajectory
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addLog(`Trajectory saved with ID: ${data.id}`, 'success');
      } else {
        addLog('Failed to save trajectory', 'error');
      }
    } catch (error) {
      addLog(`Save error: ${error.message}`, 'error');
    }
  };

  const addObstacle = () => {
    const newObstacle = {
      id: Date.now(),
      x: Math.random() * wallDimensions.width * 0.7,
      y: Math.random() * wallDimensions.height * 0.7,
      width: 0.3,
      height: 0.3,
      type: 'obstacle'
    };
    setObstacles([...obstacles, newObstacle]);
    addLog('New obstacle added', 'info');
  };

  const removeObstacle = (id) => {
    setObstacles(obstacles.filter(obs => obs.id !== id));
    addLog('Obstacle removed', 'info');
  };

  const updateObstacle = (id, updates) => {
    setObstacles(obstacles.map(obs =>
      obs.id === id ? { ...obs, ...updates } : obs
    ));
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex space-x-6">
          <div className='flex items-center'>
            <h1 className='text-blue-600 font-bold text-5xl te'>10x</h1>
          </div>
          <div className='flex justify-between w-full'>

            <div>
              <h1 className="text-xl font-semibold text-white">
                Autonomous Wall-Finishing Robot Control System
              </h1>
              <p className="text-blue-200">
                Advanced trajectory planning and visualization for robotic wall finishing operations
              </p>
            </div>
            <div>
              <button
                onClick={() => setSaved(!saved)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${saved
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                  }`}
              >
                {saved ? '← Back to Control' : 'Saved Trajectories'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {saved ? (
        <div className='w-full flex px-6 pb-6'>
          <SavedTrajectories />
        </div>
      ) : (

        <div className='w-full px-6 pb-6'>
          <div className='w-full space-y-4'>
            <div className='flex w-full space-x-4'>
              {/* Wall Config */}
              <ControlPanel
                wallDimensions={wallDimensions}
                setWallDimensions={setWallDimensions}
                toolConfig={toolConfig}
                setToolConfig={setToolConfig}
                onGenerate={generateTrajectory}
                isGenerating={isGenerating}
              />
              <ObstacleManager
                obstacles={obstacles}
                onAdd={addObstacle}
                onRemove={removeObstacle}
                onUpdate={updateObstacle}
              />
            </div>


            {/* Canvas */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">2D Visualization</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>System Active</span>
                </div>
              </div>

              <CanvasVisualization
                wallDimensions={wallDimensions}
                obstacles={obstacles}
                trajectory={trajectory}
                currentPoint={currentPoint}
                onObstacleUpdate={updateObstacle}
                toolConfig={toolConfig}
              />
            </div>

            <TrajectoryControls
              trajectory={trajectory}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              currentPoint={currentPoint}
              setCurrentPoint={setCurrentPoint}
              onSave={saveTrajectory}
            />
          </div>

          {/* Logs Panel */}
          <div className="mt-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">System Logs</h3>
              <div className="bg-gray-900/50 rounded-lg p-4 max-h-40 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="flex items-center space-x-3 mb-2 text-sm">
                    <span className="text-gray-400">{log.timestamp}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${log.type === 'success' ? 'bg-green-900 text-green-200' :
                      log.type === 'error' ? 'bg-red-900 text-red-200' :
                        log.type === 'warning' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-blue-900 text-blue-200'
                      }`}>
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-gray-300">{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <p className="text-gray-500 text-sm">No logs yet...</p>
                )}
              </div>
            </div>
          </div>
        </div>

      )}
    </div >
  );
}

export default App;