import React, { useState } from 'react';
import { Settings, Zap, Wrench, ChevronDown, ChevronUp } from 'lucide-react';

const ControlPanel = ({ wallDimensions, setWallDimensions, toolConfig, setToolConfig, onGenerate, isGenerating }) => {
  const [isToolConfigOpen, setIsToolConfigOpen] = useState(false);

  const handleDimensionChange = (dimension, value) => {
    const numValue = Math.max(0.1, Math.min(20, parseFloat(value) || 0.1));
    setWallDimensions(prev => ({
      ...prev,
      [dimension]: numValue
    }));
  };

  const handleToolConfigChange = (parameter, value) => {
    if (parameter === 'overlap') {
      // ✅ Overlap: >= 0 and < tool_width
      const numValue = Math.max(0, Math.min(toolConfig.tool_width - 0.001, parseFloat(value) || 0));
      setToolConfig(prev => ({
        ...prev,
        [parameter]: numValue
      }));
    } else {
      // For other parameters (tool_width)
      const numValue = Math.max(0.01, Math.min(1, parseFloat(value) || 0.01));
      setToolConfig(prev => ({
        ...prev,
        [parameter]: numValue
      }));
    }
  };

  const effectiveWidth = toolConfig.tool_width - toolConfig.overlap;
  const estimatedPasses = Math.ceil(wallDimensions.width / effectiveWidth);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6 w-full">
      <div className="flex items-center space-x-3 mb-6">
        <Settings className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-semibold text-white">Wall Configuration</h2>
      </div>

      <div className="flex space-x-6">
        {/* Wall Dimensions */}
        <div className='space-y-6 w-full'>
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <span>Wall Dimensions</span>
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wall Width (meters)
              </label>
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={wallDimensions.width}
                onChange={(e) => handleDimensionChange('width', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Wall Height (meters)
              </label>
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={wallDimensions.height}
                onChange={(e) => handleDimensionChange('height', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tool Configuration Dropdown */}
          <div className="pt-2">
            <button
              onClick={() => setIsToolConfigOpen(!isToolConfigOpen)}
              className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 rounded-lg text-white transition-all duration-200"
            >
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Tool Configuration</span>
                <span className="text-xs text-gray-400">
                  ({(toolConfig.tool_width * 100).toFixed(0)}cm tool, {(toolConfig.overlap * 100).toFixed(0)}cm overlap)
                </span>
              </div>
              {isToolConfigOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {/* Collapsible Tool Configuration Content */}
            {isToolConfigOpen && (
              <div className="mt-4 space-y-4 p-4 bg-gray-900/30 rounded-lg border border-gray-600">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tool Width (meters)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={toolConfig.tool_width}
                    onChange={(e) => handleToolConfigChange('tool_width', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Width of the finishing tool (e.g., 0.1 = 10cm)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Overlap (meters)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={toolConfig.tool_width * 0.8}
                    step="0.005"
                    value={toolConfig.overlap}
                    onChange={(e) => handleToolConfigChange('overlap', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Overlap between passes for quality (e.g., 0.02 = 2cm)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Safety Margin (meters)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max="1"
                    step="0.01"
                    value={toolConfig.safety_margin}
                    onChange={(e) => handleToolConfigChange('safety_margin', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Safety distance from obstacles (e.g., 0.05 = 5cm)</p>
                </div>

                {/* Tool Config Summary */}
                <div className="bg-gray-800/50 rounded-lg p-3 mt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Current Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tool Width:</span>
                      <span className="text-green-400">{(toolConfig.tool_width * 100).toFixed(1)}cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Overlap:</span>
                      <span className="text-blue-400">{(toolConfig.overlap * 100).toFixed(1)}cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Safety:</span>
                      <span className="text-yellow-400">{(toolConfig.safety_margin * 100).toFixed(1)}cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Effective:</span>
                      <span className="text-white">{(effectiveWidth * 100).toFixed(1)}cm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>


        </div>

        {/* Coverage Info */}
        <div className="bg-gray-900/50 rounded-lg p-4 w-full h-fit">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Coverage Analysis</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Total Area:</span>
              <span className="text-white">{(wallDimensions.width * wallDimensions.height).toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between">
              <span>Perimeter:</span>
              <span className="text-white">{(2 * (wallDimensions.width + wallDimensions.height)).toFixed(2)} m</span>
            </div>
            <div className="flex justify-between">
              <span>Effective Tool Width:</span>
              <span className="text-green-400">{effectiveWidth.toFixed(3)} m</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Passes:</span>
              <span className="text-blue-400">{estimatedPasses}</span>
            </div>
            <div className="flex justify-between">
              <span>Coverage Efficiency:</span>
              <span className="text-yellow-400">{((effectiveWidth / toolConfig.tool_width) * 100).toFixed(1)}%</span>
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-4 mt-6 border-t border-gray-700">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
            >
              <Zap className="w-4 h-4" />
              <span>{isGenerating ? 'Generating...' : 'Generate Trajectory'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;