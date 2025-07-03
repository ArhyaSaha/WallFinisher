// src/components/SavedTrajectories.jsx
import React, { useState, useEffect } from 'react';
import { Archive, Calendar, Square, Activity, Clock, Layers, Trash2 } from 'lucide-react';
import { API_BASE_URL } from '../utils/api';
import { toast } from 'react-toastify';

const SavedTrajectories = () => {
    const [trajectories, setTrajectories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchTrajectories();
    }, []);

    const fetchTrajectories = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/trajectories?limit=20`);

            if (!response.ok) {
                throw new Error('Failed to fetch trajectories');
            }

            const data = await response.json();
            setTrajectories(data.trajectories);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteTrajectory = async (id) => {
        try {
            setDeleting(true);
            const response = await fetch(`${API_BASE_URL}/trajectory/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete trajectory');
            }

            setTrajectories((prev) => prev.filter((trajectory) => trajectory.id !== id));
            toast.success(`Trajectory #${id} deleted successfully!`);
        } catch (err) {
            toast.error(`Failed to delete trajectory: ${err.message}`);
        } finally {
            setDeleting(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    <span className="ml-3 text-gray-300">Loading trajectories...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="text-red-400 text-lg mb-2">Error Loading Trajectories</div>
                        <div className="text-gray-400">{error}</div>
                        <button
                            onClick={fetchTrajectories}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <Archive className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-semibold text-white">Saved Trajectories</h2>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>{trajectories.length} trajectories found</span>
                    <button
                        onClick={fetchTrajectories}
                        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Trajectories Grid */}
            {trajectories.length === 0 ? (
                <div className="text-center py-12">
                    <Archive className="w-12 h-12 mx-auto mb-4 text-gray-500 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-400 mb-2">No Saved Trajectories</h3>
                    <p className="text-gray-500">Generate and save trajectories to see them here</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trajectories.map((trajectory) => (
                        <div
                            key={trajectory.id}
                            className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-600 p-4 hover:border-gray-500 transition-all duration-200 hover:shadow-lg"
                        >
                            {/* Trajectory Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">
                                            Trajectory #{trajectory.id}
                                        </h3>
                                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                                            <Calendar className="w-3 h-3" />
                                            <span>{formatDate(trajectory.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Delete Button */}
                                <button
                                    onClick={() => deleteTrajectory(trajectory.id)}
                                    disabled={deleting}
                                    className="flex items-center justify-center w-8 h-8 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-600 hover:text-red-900" />
                                </button>
                            </div>

                            {/* Trajectory Details */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2 text-gray-400">
                                        <Square className="w-3 h-3" />
                                        <span>Dimensions:</span>
                                    </div>
                                    <span className="text-white font-medium">
                                        {trajectory.wall_width}m × {trajectory.wall_height}m
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2 text-gray-400">
                                        <Layers className="w-3 h-3" />
                                        <span>Total Points:</span>
                                    </div>
                                    <span className="text-blue-400 font-medium">
                                        {trajectory.total_points || 'N/A'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center space-x-2 text-gray-400">
                                        <Square className="w-3 h-3" />
                                        <span>Area:</span>
                                    </div>
                                    <span className="text-green-400 font-medium">
                                        {(trajectory.wall_width * trajectory.wall_height).toFixed(2)} m²
                                    </span>
                                </div>

                                {trajectory.execution_time && (
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-2 text-gray-400">
                                            <Clock className="w-3 h-3" />
                                            <span>Gen. Time:</span>
                                        </div>
                                        <span className="text-yellow-400 font-medium">
                                            {trajectory.execution_time.toFixed(3)}s
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SavedTrajectories;