# 🤖 Wall-Finishing Robot Control System

This is the backend API for an autonomous wall-finishing robot control system. The system is built with FastAPI and SQLite, featuring robust server-intensive computations and database-driven trajectory management.

Deployed Link: [https://10x.arhya.codes](https://10x.arhya.codes)

## Project Overview

The backend handles:

- **Intensive Computations**: Intelligent path planning algorithms for rectangular walls
- **Real-time Communication**: Message broker integration for system coordination
- **Detailed Logging**: Comprehensive monitoring of request handling and response timing
- **Database Optimization**: SQLite with indexing for efficient trajectory storage and retrieval

## Assignment Objectives ✅

### Coverage Planning

- ✅ **Basic coverage planning logic** for rectangular walls using boustrophedon (back-and-forth) patterns
- ✅ **Custom dimensions input** - Users can specify wall width and height
- ✅ **Rectangular obstacles support** - Windows and obstacles with configurable dimensions and positions
- ✅ **Intelligent obstacle avoidance** with safety margins and tool overlap optimization

### Backend Data Management

- ✅ **FastAPI RESTful API** with comprehensive endpoint coverage
- ✅ **SQLite database** with optimized schema and indexing for performance
- ✅ **Query APIs** for retrieving stored trajectory data with filtering and pagination
- ✅ **Request logging** with detailed timing metrics and performance monitoring
- ✅ **CRUD operations** for trajectory management (Create, Read, Update, Delete)

### Testing & Validation

- ✅ **API testing suite** using pytest and FastAPI TestClient
- ✅ **Response time validation** with performance benchmarks
- ✅ **CRUD operation testing** covering all database interactions
- ✅ **Error handling validation** for edge cases and invalid inputs

## Features

- **Intelligent Coverage Planning**: Optimized path generation with obstacle avoidance and tool overlap
- **Database Management**: SQLite with strategic indexing for fast trajectory storage and retrieval
- **Real-time Logging**: Comprehensive request monitoring with execution time tracking
- **RESTful API**: Clean, documented endpoints following REST principles
- **Performance Optimization**: Database indexing, query optimization, and memory-efficient algorithms
- **Message Broker Integration**: Real-time communication system for robot coordination

## API Endpoints

### Core Endpoints

- `GET /` - API health check and system status
- `POST /generate_trajectory` - Generate optimized coverage trajectory for rectangular walls
- `POST /save_trajectory` - Save generated trajectory to database with metadata
- `GET /trajectories` - Retrieve stored trajectories with pagination and filtering
- `GET /trajectory/{id}` - Get specific trajectory by ID
- `DELETE /trajectory/{id}` - Delete trajectory by ID
- `GET /trajectory/search` - Search trajectories by criteria (dimensions, obstacles, etc.)
- `GET /trajectory/stats` - Get database statistics and analytics
- `GET /system_status` - System performance metrics and monitoring

### Execute Trajectory Endpoint

The `POST /execute_trajectory/{trajectory_id}` endpoint simulates the execution of a stored trajectory by the robot. When called, it:

- Retrieves the specified trajectory from the database.
- Starts a new execution session and logs the session.
- Publishes real-time status updates (start and completion) via the message broker.
- Simulates the robot's movement along the trajectory, logging each action in detail.
- Returns the session ID, execution status, trajectory ID, and the number of points executed.

**Data Storage:**

- Execution sessions and detailed robot actions are logged in the database (`robot_actions` table), including action type, parameters, timestamps, and status.
- Status messages are queued in the message broker for real-time monitoring.

**Example Usage:**

```bash
curl -X POST "http://localhost:8000/execute_trajectory/1"
```

### Database Schema

**Trajectories Table:**

- `id` - Primary key
- `wall_width` - Wall width in meters
- `wall_height` - Wall height in meters
- `obstacles` - JSON array of obstacles
- `trajectory_data` - JSON array of trajectory points
- `created_at` - Timestamp
- `execution_time` - Generation time
- `total_points` - Number of trajectory points

**System Logs Table:**

- `id` - Primary key
- `timestamp` - Log timestamp
- `level` - Log level (INFO, ERROR, etc.)
- `message` - Log message
- `request_id` - Associated request ID
- `execution_time` - Request execution time

**Robot Actions Table:**

- `id` - Primary key
- `trajectory_id` - Foreign key referencing trajectories table
- `action_type` - Type of action (e.g., MOVE, STOP, ACTIVATE_TOOL, DEACTIVATE_TOOL)
- `parameters` - JSON object with action-specific parameters (e.g., coordinates, speed)
- `timestamp` - Action execution timestamp
- `status` - Action status (PENDING, COMPLETED, FAILED)

**Message Queue Table:**

- `id` - Primary key
- `message_type` - Type of message (COMMAND, STATUS_UPDATE, ERROR, etc.)
- `payload` - JSON object containing message data
- `created_at` - Timestamp when message was queued
- `processed` - Boolean flag indicating if the message has been processed
- `processed_at` - Timestamp when message was processed (nullable)

## Coverage Planning Algorithm

The system implements a **boustrophedon (back-and-forth) coverage pattern** specifically designed for rectangular walls with rectangular obstacles:

### Core Algorithm Features:

- **Vertical Line Pattern**: Robot moves in alternating up-down passes across the wall width
- **Obstacle Avoidance**: Intelligent navigation around rectangular windows and obstacles
- **Tool Overlap**: Configurable overlap between passes for complete coverage guarantee
- **Safety Margins**: Automatic safety buffer around all obstacles
- **Speed Optimization**: Variable speeds (0.1 m/s working, 0.15-0.2 m/s positioning)
- **Path Optimization**: Minimal trajectory points for smooth robot motion

### Algorithm Implementation:

1. **Grid-based Coverage**: Divides wall into tool-width vertical strips
2. **Obstacle Detection**: Identifies intersections with rectangular obstacles
3. **Safe Navigation**: Plans paths around obstacles with safety margins
4. **Tool State Management**: Activates/deactivates tool based on obstacle proximity
5. **Trajectory Generation**: Creates optimized point sequence with timing

## Logging & Monitoring

### Multi-Level Logging System:

All requests and system events are comprehensively logged to:

1. **Console Output** (Real-time monitoring):

   ```bash
   2024-07-03 09:15:23 - WallFinishingRobot - INFO - Request 1720000523001: POST /generate_trajectory
   2024-07-03 09:15:24 - WallFinishingRobot - INFO - Generated 127 trajectory points in 1.234s
   2024-07-03 09:15:24 - WallFinishingRobot - INFO - Request 1720000523001 completed in 2.156s
   ```

2. **File Logging** (`robot_control.log`):

   - Persistent storage for historical analysis
   - Detailed error tracking and debugging
   - Performance trend analysis

3. **Database Logging** (SQLite system_logs table):
   - Structured storage for analytics
   - Query-able log data for reporting
   - Performance metrics aggregation

### Request Monitoring Features:

- **Execution Time Tracking**: Every request timed to millisecond precision
- **Performance Alerts**: Automatic warnings for slow operations (>5s)
- **Error Classification**: Categorized error levels (INFO, WARNING, ERROR)
- **Request Correlation**: Unique request IDs for tracing

## Testing Suite

### Comprehensive Test Coverage:

```bash
# Run complete test suite
pytest test_api.py -v
```

### Test Categories:

1. **API Endpoint Testing**:

   - CRUD operations validation
   - Response time benchmarks (< 5s requirement)
   - Error handling and edge cases
   - Input validation and sanitization

2. **Database Testing**:

   - Query performance validation
   - Data integrity checks
   - Indexing effectiveness
   - Concurrent access handling

3. **Algorithm Testing**:

   - Coverage completeness verification
   - Obstacle avoidance accuracy
   - Path optimization validation
   - Performance under various wall sizes

### Performance Validation:

- **Response Time Limits**: All endpoints must respond within 5 seconds
- **Concurrent Requests**: Handles 5+ simultaneous users
- **Database Performance**: Queries optimized with proper indexing

## Installation

### Frontend Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install frontend dependencies:

   ```bash
   npm install
   ```

3. Start the frontend development server:

   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the server:

   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`
