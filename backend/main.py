import logging
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import math
import sqlite3
import json
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from models import (
    TrajectoryRequest, SaveTrajectoryRequest, TrajectoryPoint,Obstacle
)
from services import (
    CoveragePlanner, DatabaseManager, RobotActionLogger, MessageBroker
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('robot_control.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("WallFinishingRobot")
logging.getLogger("watchfiles").setLevel(logging.WARNING)

    
# Initialize FastAPI app
app = FastAPI(
    title="Wall-Finishing Robot Control System",
    description="Advanced trajectory planning and control system for autonomous wall finishing robots",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
db_manager = DatabaseManager()
coverage_planner = CoveragePlanner()
robot_logger = RobotActionLogger(db_manager)
message_broker = MessageBroker(db_manager)

# Set up message broker subscriptions
def handle_trajectory_command(message):
    logger.info(f"Processing trajectory command: {message}")

def handle_robot_status(message):
    logger.info(f"Robot status update: {message}")

message_broker.subscribe("trajectory_commands", handle_trajectory_command)
message_broker.subscribe("robot_status", handle_robot_status)

# Middleware for request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    request_id = f"{int(time.time() * 1000)}"
    
    # Log incoming request
    logger.info(f"Request {request_id}: {request.method} {request.url}")
    
    response = await call_next(request)
    
    # Calculate execution time
    execution_time = time.time() - start_time
    
    # Log response
    logger.info(f"Request {request_id} completed in {execution_time:.3f}s with status {response.status_code}")
    
    # Save to database
    db_manager.log_request(
        level="INFO",
        message=f"{request.method} {request.url} - {response.status_code}",
        request_id=request_id,
        execution_time=execution_time
    )
    
    return response

@app.get("/")
async def root():
    """API Health Check"""
    return {
        "message": "Wall-Finishing Robot Control System API",
        "status": "operational",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/generate_trajectory")
async def generate_trajectory(request: TrajectoryRequest, req: Request):
    """Generate trajectory for wall finishing with configurable tool parameters"""
    request_id = id(request)
    logger.info(f"Request {request_id}: POST {req.url}")
    
    start_time = time.time()
    
    try:
        logger.info(f"Generating trajectory for {request.wall_width}x{request.wall_height}m wall")
        logger.info(f"Tool parameters: width={request.tool_width}m, overlap={request.overlap}m")
        logger.info(f"Obstacles: {len(request.obstacles)}")
        
        # Create coverage planner with custom parameters
        coverage_planner = CoveragePlanner(
            tool_width=request.tool_width,
            overlap=request.overlap,
            safety_margin=request.safety_margin
        )
        
        # Generate trajectory points
        trajectory_points = coverage_planner.generate_coverage_pattern(
            request.wall_width, 
            request.wall_height, 
            request.obstacles
        )
        
        # Convert to response format
        trajectory_data = [
            {
                "x": point.x,
                "y": point.y,
                "angle": point.angle,
                "speed": point.speed,
                "tool_active": point.tool_active
            }
            for point in trajectory_points
        ]
        
        execution_time = time.time() - start_time
        logger.info(f"Trajectory generation completed in {execution_time:.3f}s with {len(trajectory_data)} points")
        
        return {
            "success": True,
            "trajectory": trajectory_data,
            "metadata": {
                "wall_dimensions": f"{request.wall_width}x{request.wall_height}m",
                "tool_config": {
                    "tool_width": request.tool_width,
                    "overlap": request.overlap,
                    "safety_margin": request.safety_margin,
                    "effective_width": request.tool_width - request.overlap
                },
                "obstacles_count": len(request.obstacles),
                "points_count": len(trajectory_data),
                "generation_time": f"{execution_time:.3f}s"
            }
        }
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(f"Trajectory generation failed after {execution_time:.3f}s: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Trajectory generation failed: {str(e)}")
    
    finally:
        execution_time = time.time() - start_time
        logger.info(f"Request {request_id} completed in {execution_time:.3f}s with status {200 if 'trajectory_data' in locals() else 500}")

@app.post("/save_trajectory")
async def save_trajectory(request: SaveTrajectoryRequest):
    """
    Save generated trajectory to database for future reference
    """
    try:
        trajectory_id = db_manager.save_trajectory(
            request.wall_width,
            request.wall_height,
            request.obstacles,
            request.trajectory
        )
        
        logger.info(f"Trajectory saved with ID: {trajectory_id}")
        
        return {
            "id": trajectory_id,
            "message": "Trajectory saved successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to save trajectory: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save trajectory: {str(e)}")

@app.get("/trajectories")
async def get_trajectories(limit: int = 10):
    """
    Retrieve saved trajectories with metadata
    """
    try:
        trajectories = db_manager.get_trajectories(limit)
        logger.info(f"Retrieved {len(trajectories)} trajectories")
        
        return {
            "trajectories": trajectories,
            "count": len(trajectories)
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve trajectories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve trajectories: {str(e)}")

@app.get("/system_status")
async def get_system_status():
    """
    Get system status and performance metrics
    """
    try:
        with db_manager.get_connection() as conn:
            # Get trajectory count
            trajectory_count = conn.execute("SELECT COUNT(*) FROM trajectories").fetchone()[0]
            
            # Get recent logs
            recent_logs = conn.execute('''
                SELECT level, message, timestamp 
                FROM system_logs 
                ORDER BY timestamp DESC 
                LIMIT 10
            ''').fetchall()
            
            # Get average execution time
            avg_execution = conn.execute('''
                SELECT AVG(execution_time) 
                FROM system_logs 
                WHERE execution_time IS NOT NULL
            ''').fetchone()[0]
        
        return {
            "status": "operational",
            "statistics": {
                "total_trajectories": trajectory_count,
                "average_request_time": round(avg_execution or 0, 3),
                "uptime": "N/A"  # Would need startup time tracking
            },
            "recent_logs": [dict(log) for log in recent_logs]
        }
        
    except Exception as e:
        logger.error(f"Failed to get system status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get system status: {str(e)}")
    
@app.post("/execute_trajectory/{trajectory_id}")
async def execute_trajectory(trajectory_id: int):
    """
    Simulate robot execution with detailed action logging
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.execute('''
                SELECT trajectory_data FROM trajectories WHERE id = ?
            ''', (trajectory_id,))
            result = cursor.fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Trajectory not found")
            
            trajectory_data = json.loads(result[0])
        
        # Start execution session
        session_id = robot_logger.start_execution_session(trajectory_id)
        
        # Publish start message
        message_broker.publish("robot_status", f"Starting execution of trajectory {trajectory_id}", priority=8)
        
        # Simulate execution with detailed logging
        robot_logger.simulate_robot_execution(trajectory_data)
        
        # Publish completion message
        message_broker.publish("robot_status", f"Completed execution of trajectory {trajectory_id}", priority=8)
        
        return {
            "session_id": session_id,
            "status": "completed",
            "trajectory_id": trajectory_id,
            "points_executed": len(trajectory_data)
        }
        
    except Exception as e:
        logger.error(f"Execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Execution failed: {str(e)}")

@app.delete("/trajectory/{trajectory_id}")
async def delete_trajectory(trajectory_id: int):
    """
    Delete a specific trajectory by ID
    """
    try:
        with db_manager.get_connection() as conn:
            # Check if the trajectory exists
            cursor = conn.execute("SELECT id FROM trajectories WHERE id = ?", (trajectory_id,))
            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Trajectory not found")
            
            # Delete the trajectory
            conn.execute("DELETE FROM trajectories WHERE id = ?", (trajectory_id,))
            conn.commit()
        
        logger.info(f"Trajectory {trajectory_id} deleted successfully")
        return {"message": f"Trajectory {trajectory_id} deleted successfully"}
    
    except Exception as e:
        logger.error(f"Failed to delete trajectory {trajectory_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete trajectory: {str(e)}")
    

@app.get("/robot_actions/{session_id}")
async def get_robot_actions(session_id: str):
    """
    Get detailed robot actions for a specific session
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.execute('''
                SELECT action_type, details, timestamp 
                FROM robot_actions 
                WHERE session_id = ?
                ORDER BY timestamp ASC
            ''', (session_id,))
            actions = [dict(row) for row in cursor.fetchall()]
        
        return {
            "session_id": session_id,
            "actions": actions,
            "total_actions": len(actions)
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve robot actions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve robot actions: {str(e)}")

@app.get("/messages/{topic}")
async def get_messages(topic: str, limit: int = 50):
    """
    Get messages from message broker queue
    """
    try:
        with db_manager.get_connection() as conn:
            cursor = conn.execute('''
                SELECT message, status, created_at, processed_at 
                FROM message_queue 
                WHERE topic = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (topic, limit))
            messages = [dict(row) for row in cursor.fetchall()]
        
        return {
            "topic": topic,
            "messages": messages,
            "count": len(messages)
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages: {str(e)}")

@app.post("/process_messages")
async def process_pending_messages():
    """
    Manually trigger message processing
    """
    try:
        processed_count = message_broker.process_messages()
        return {
            "processed_messages": processed_count,
            "status": "completed"
        }
        
    except Exception as e:
        logger.error(f"Failed to process messages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process messages: {str(e)}")

if __name__ == "__main__":
    logger.info("Starting Wall-Finishing Robot Control System API")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )