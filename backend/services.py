import sqlite3
import json
import time
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from contextlib import contextmanager
from models import TrajectoryPoint, Obstacle

logger = logging.getLogger("WallFinishingRobot")

class DatabaseManager:
    def __init__(self, db_path: str = "robot_trajectories.db"):
        self.db_path = db_path
        self.init_database()

    @contextmanager
    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def init_database(self):
        """Initialize database with required tables and indexes"""
        with self.get_connection() as conn:
            # Create trajectories table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS trajectories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    wall_width REAL NOT NULL,
                    wall_height REAL NOT NULL,
                    obstacles TEXT NOT NULL,
                    trajectory_data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    execution_time REAL,
                    total_points INTEGER,
                    coverage_percentage REAL,
                    optimization_level TEXT DEFAULT 'basic'
                )
            ''')
            
            # Create robot actions table for detailed logging
            conn.execute('''
                CREATE TABLE IF NOT EXISTS robot_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    details TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    execution_duration REAL,
                    position_x REAL,
                    position_y REAL
                )
            ''')
            
            # Create message queue table (simple message broker simulation)
            conn.execute('''
                CREATE TABLE IF NOT EXISTS message_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    topic TEXT NOT NULL,
                    message TEXT NOT NULL,
                    priority INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP,
                    retry_count INTEGER DEFAULT 0
                )
            ''')
            
            # Create indexes for better query performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_wall_dimensions ON trajectories(wall_width, wall_height)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_created_at ON trajectories(created_at)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_execution_time ON trajectories(execution_time)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_robot_actions_session ON robot_actions(session_id)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_robot_actions_type ON robot_actions(action_type)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_message_queue_topic ON message_queue(topic)')
            
            # Create logs table for system monitoring
            conn.execute('''
                CREATE TABLE IF NOT EXISTS system_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    request_id TEXT,
                    execution_time REAL
                )
            ''')
            
            conn.execute('CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON system_logs(timestamp)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level)')
            
            conn.commit()
            logger.info("Database initialized successfully")

    def save_trajectory(self, wall_width: float, wall_height: float, 
                       obstacles: List[Dict], trajectory: List[Dict]) -> int:
        """Save trajectory with full data"""
        with self.get_connection() as conn:
            cursor = conn.execute('''
                INSERT INTO trajectories (wall_width, wall_height, obstacles, trajectory_data, total_points)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                wall_width,
                wall_height,
                json.dumps(obstacles),
                json.dumps(trajectory),
                len(trajectory)
            ))
            trajectory_id = cursor.lastrowid
            conn.commit()
            return trajectory_id

    def get_trajectories(self, limit: int = 100) -> List[Dict]:
        """Retrieve trajectories with metadata"""
        with self.get_connection() as conn:
            cursor = conn.execute('''
                SELECT id, wall_width, wall_height, created_at, total_points, execution_time
                FROM trajectories 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def log_request(self, level: str, message: str, request_id: str = None, execution_time: float = None):
        """Log system events"""
        with self.get_connection() as conn:
            conn.execute('''
                INSERT INTO system_logs (level, message, request_id, execution_time)
                VALUES (?, ?, ?, ?)
            ''', (level, message, request_id, execution_time))
            conn.commit()

class RobotActionLogger:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.current_session_id = None
    
    def start_execution_session(self, trajectory_id: int) -> str:
        """Start a new robot execution session"""
        self.current_session_id = f"session_{int(time.time() * 1000)}"
        self.log_action("SESSION_START", f"Started trajectory execution for ID: {trajectory_id}")
        return self.current_session_id
    
    def log_action(self, action_type: str, details: str):
        """Log robot actions like movement, turns, obstacles"""
        with self.db_manager.get_connection() as conn:
            conn.execute('''
                INSERT INTO robot_actions (session_id, action_type, details, timestamp)
                VALUES (?, ?, ?, ?)
            ''', (self.current_session_id, action_type, details, datetime.now().isoformat()))
            conn.commit()
        logger.info(f"Robot Action - {action_type}: {details}")
    
    def simulate_robot_execution(self, trajectory: List[Dict]):
        """Simulate robot execution with detailed logging"""
        for i, point in enumerate(trajectory):
            if i == 0:
                self.log_action("MOVE_START", f"Starting at position ({point['x']:.2f}, {point['y']:.2f})")
            else:
                prev_point = trajectory[i-1]
                
                # Log movement type
                if abs(point['y'] - prev_point['y']) < 0.01:
                    self.log_action("MOVE_HORIZONTAL", f"Moving horizontally to ({point['x']:.2f}, {point['y']:.2f})")
                elif abs(point['x'] - prev_point['x']) < 0.01:
                    self.log_action("MOVE_VERTICAL", f"Moving vertically to ({point['x']:.2f}, {point['y']:.2f})")
                else:
                    self.log_action("MOVE_DIAGONAL", f"Moving diagonally to ({point['x']:.2f}, {point['y']:.2f})")
                
                # Log turns
                if abs(point['angle'] - prev_point['angle']) > 0.1:
                    self.log_action("TURN", f"Turning to angle {point['angle']:.2f} radians")
            
            # Simulate processing time
            time.sleep(0.01)  # 10ms per point simulation

class MessageBroker:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.subscribers = {}
    
    def publish(self, topic: str, message: str, priority: int = 0):
        """Publish message to a topic"""
        with self.db_manager.get_connection() as conn:
            conn.execute('''
                INSERT INTO message_queue (topic, message, priority)
                VALUES (?, ?, ?)
            ''', (topic, message, priority))
            conn.commit()
        
        logger.info(f"Message published to topic '{topic}': {message}")
        
        # Immediately process high-priority messages
        if priority > 5:
            self.process_messages(topic)
    
    def subscribe(self, topic: str, callback_func):
        """Subscribe to a topic"""
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        self.subscribers[topic].append(callback_func)
    
    def process_messages(self, topic: str = None):
        """Process pending messages"""
        with self.db_manager.get_connection() as conn:
            if topic:
                cursor = conn.execute('''
                    SELECT id, topic, message FROM message_queue 
                    WHERE status = 'pending' AND topic = ?
                    ORDER BY priority DESC, created_at ASC
                ''', (topic,))
            else:
                cursor = conn.execute('''
                    SELECT id, topic, message FROM message_queue 
                    WHERE status = 'pending'
                    ORDER BY priority DESC, created_at ASC
                ''')
            
            messages = cursor.fetchall()
            
            for msg in messages:
                msg_id, msg_topic, msg_content = msg
                
                # Process message with subscribers
                if msg_topic in self.subscribers:
                    for callback in self.subscribers[msg_topic]:
                        try:
                            callback(msg_content)
                        except Exception as e:
                            logger.error(f"Error processing message {msg_id}: {e}")
                
                # Mark as processed
                conn.execute('''
                    UPDATE message_queue 
                    SET status = 'processed', processed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (msg_id,))
            
            conn.commit()
            return len(messages)

class CoveragePlanner:
    def __init__(self, tool_width: float = 0.1, overlap: float = 0.02, safety_margin: float = 0.05):
        self.tool_width = tool_width
        self.overlap = overlap
        self.safety_margin = safety_margin

    def generate_coverage_pattern(self, wall_width: float, wall_height: float, 
                                 obstacles: List[Obstacle]) -> List[TrajectoryPoint]:
        """Generate optimized trajectory with VERTICAL passes, moving by tool width"""
        logger.info(f"Generating VERTICAL trajectory for {wall_width}x{wall_height}m wall")
        logger.info(f"Tool config: width={self.tool_width}m, overlap={self.overlap}m")
        
        trajectory = []
        step_size = self.tool_width - self.overlap  # Tool coverage width
        
        x = 0  # Start from left edge
        going_up = True  # Alternate between up and down
        
        while x < wall_width:
            if going_up:
                # Bottom to top pass
                trajectory.append(TrajectoryPoint(x=x, y=0,  angle=0.0,speed=0.15,tool_active=False))
                trajectory.extend(self._generate_optimized_line(x, 0, wall_height, 90.0, obstacles))
            else:
                # Top to bottom pass
                trajectory.append(TrajectoryPoint(x=x, y=wall_height,  angle=0.0,speed=0.15,tool_active=False))
                trajectory.extend(self._generate_optimized_line(x, wall_height, 0, 270.0, obstacles))

            x += step_size  # Move to next vertical line (by tool width)
            going_up = not going_up  # Alternate direction
        
        logger.info(f"Generated optimized VERTICAL trajectory with {len(trajectory)} points")
        return trajectory

    # ... rest of the methods remain the same

    def _generate_optimized_line(self, x: float, start_y: float, end_y: float, 
                               angle: float, obstacles: List[Obstacle]) -> List[TrajectoryPoint]:
        """Generate optimized VERTICAL line with minimal points and tool_active flags"""
        points = []
        
        if start_y < end_y:
            # Moving UP (bottom to top)
            current_y = start_y
            
            while current_y < end_y:
                # Find next obstacle or end of line
                next_obstacle = self._find_next_obstacle_vertical(x, current_y, obstacles, going_up=True)
                
                if next_obstacle:
                    obstacle_start = next_obstacle.y - self.safety_margin
                    obstacle_end = next_obstacle.y + next_obstacle.height + self.safety_margin
                    
                    # Add working segment before obstacle
                    if current_y < obstacle_start:
                        points.append(TrajectoryPoint(
                            x=x, y=current_y, angle=angle, speed=0.1, tool_active=True
                        ))
                        points.append(TrajectoryPoint(
                            x=x, y=obstacle_start, angle=angle, speed=0.1, tool_active=True
                        ))
                    
                    # Add non-working segment over obstacle
                    points.append(TrajectoryPoint(
                        x=x, y=obstacle_start, angle=angle, speed=0.2, tool_active=False
                    ))
                    points.append(TrajectoryPoint(
                        x=x, y=obstacle_end, angle=angle, speed=0.2, tool_active=False
                    ))
                    
                    current_y = obstacle_end
                else:
                    # No more obstacles, finish the line
                    points.append(TrajectoryPoint(
                        x=x, y=current_y, angle=angle, speed=0.1, tool_active=True
                    ))
                    points.append(TrajectoryPoint(
                        x=x, y=end_y, angle=angle, speed=0.1, tool_active=True
                    ))
                    break
        else:
            # Moving DOWN (top to bottom)
            current_y = start_y
            
            while current_y > end_y:
                next_obstacle = self._find_next_obstacle_vertical(x, current_y, obstacles, going_up=False)
                
                if next_obstacle:
                    obstacle_start = next_obstacle.y + next_obstacle.height + self.safety_margin
                    obstacle_end = next_obstacle.y - self.safety_margin
                    
                    # Add working segment before obstacle
                    if current_y > obstacle_start:
                        points.append(TrajectoryPoint(
                            x=x, y=current_y, angle=angle, speed=0.1, tool_active=True
                        ))
                        points.append(TrajectoryPoint(
                            x=x, y=obstacle_start, angle=angle, speed=0.1, tool_active=True
                        ))
                    
                    # Add non-working segment over obstacle
                    points.append(TrajectoryPoint(
                        x=x, y=obstacle_start, angle=angle, speed=0.2, tool_active=False
                    ))
                    points.append(TrajectoryPoint(
                        x=x, y=obstacle_end, angle=angle, speed=0.2, tool_active=False
                    ))
                    
                    current_y = obstacle_end
                else:
                    # No more obstacles, finish the line
                    points.append(TrajectoryPoint(
                        x=x, y=current_y, angle=angle, speed=0.1, tool_active=True
                    ))
                    points.append(TrajectoryPoint(
                        x=x, y=end_y, angle=angle, speed=0.1, tool_active=True
                    ))
                    break
        
        return points

    def _find_next_obstacle_vertical(self, x: float, current_y: float, obstacles: List[Obstacle], 
                                   going_up: bool) -> Optional[Obstacle]:
        """Find the next obstacle in the current VERTICAL direction"""
        next_obstacle = None
        min_distance = float('inf')
        
        for obstacle in obstacles:
            # Check if obstacle intersects with current x level
            if (obstacle.x - self.safety_margin<= x <= 
                obstacle.x + obstacle.width + self.safety_margin):
                
                if going_up:
                    # Look for obstacles above
                    if obstacle.y > current_y:
                        distance = obstacle.y - current_y
                        if distance < min_distance:
                            min_distance = distance
                            next_obstacle = obstacle
                else:
                    # Look for obstacles below
                    if obstacle.y + obstacle.height < current_y:
                        distance = current_y - (obstacle.y + obstacle.height)
                        if distance < min_distance:
                            min_distance = distance
                            next_obstacle = obstacle
        
        return next_obstacle