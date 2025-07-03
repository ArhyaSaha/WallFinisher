import React from 'react';
import { Plus, Trash2, Square } from 'lucide-react';

const ObstacleManager = ({ obstacles, onAdd, onRemove, onUpdate }) => {
  const handleObstacleUpdate = (id, field, value) => {
    const numValue = Math.max(0.01, parseFloat(value) || 0.01);
    onUpdate(id, { [field]: numValue });
  };

  const handleTypeChange = (id, type) => {
    onUpdate(id, { type });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Square className="w-5 h-5 text-yellow-400" />
          <h2 className="text-xl font-semibold text-white">Obstacles</h2>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      <div className="space-y-4 max-h-64 overflow-y-auto">
        {obstacles.map((obstacle, index) => (
          <div key={obstacle.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-white">
                Obstacle {index + 1}
              </h3>
              <div className="flex items-center space-x-2">
                <select
                  value={obstacle.type}
                  onChange={(e) => handleTypeChange(obstacle.id, e.target.value)}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                >
                  <option value="window">Window</option>
                  <option value="obstacle">Obstacle</option>
                  <option value="door">Door</option>
                </select>
                <button
                  onClick={() => onRemove(obstacle.id)}
                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">X Position (m)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={obstacle.x.toFixed(2)}
                  onChange={(e) => handleObstacleUpdate(obstacle.id, 'x', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Y Position (m)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={obstacle.y.toFixed(2)}
                  onChange={(e) => handleObstacleUpdate(obstacle.id, 'y', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Width (m)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={obstacle.width.toFixed(2)}
                  onChange={(e) => handleObstacleUpdate(obstacle.id, 'width', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Height (m)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={obstacle.height.toFixed(2)}
                  onChange={(e) => handleObstacleUpdate(obstacle.id, 'height', e.target.value)}
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                />
              </div>
            </div>
          </div>
        ))}

        {obstacles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Square className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No obstacles added yet</p>
            <p className="text-sm">Click "Add" to create an obstacle</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObstacleManager;