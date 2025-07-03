import pytest
import time
try:
    from fastapi.testclient import TestClient
except ImportError:
    from starlette.testclient import TestClient
from main import app

# Create test client
client = TestClient(app)

class TestAPI:
    """Basic API tests for Wall-Finishing Robot Control System"""
    
    def test_root_health_check(self):
        """Test API health check endpoint"""
        start_time = time.time()
        response = client.get("/")
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        assert response.json()["status"] == "operational"
        assert "timestamp" in response.json()
        assert execution_time < 1.0  # Should respond within 1 second
    
    def test_generate_trajectory_basic(self):
        """Test basic trajectory generation"""
        start_time = time.time()
        
        request_data = {
            "wall_width": 5.0,
            "wall_height": 3.0,
            "obstacles": [],
            "tool_width": 0.1,
            "overlap": 0.02,
            "safety_margin": 0.05
        }
        
        response = client.post("/generate_trajectory", json=request_data)
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "trajectory" in data
        assert len(data["trajectory"]) > 0
        assert "metadata" in data
        assert execution_time < 5.0  # Should generate within 5 seconds
    
    def test_generate_trajectory_with_obstacles(self):
        """Test trajectory generation with obstacles"""
        start_time = time.time()
        
        request_data = {
            "wall_width": 4.0,
            "wall_height": 2.5,
            "obstacles": [
                {"x": 1.0, "y": 0.5, "width": 0.5, "height": 0.3},
                {"x": 2.5, "y": 1.2, "width": 0.3, "height": 0.4}
            ],
            "tool_width": 0.15,
            "overlap": 0.03,
            "safety_margin": 0.1
        }
        
        response = client.post("/generate_trajectory", json=request_data)
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["metadata"]["obstacles_count"] == 2
        assert execution_time < 5.0
    
    def test_save_trajectory(self):
        """Test saving trajectory to database"""
        start_time = time.time()
        
        # First generate a trajectory
        trajectory_request = {
            "wall_width": 3.0,
            "wall_height": 2.0,
            "obstacles": [],
            "tool_width": 0.1,
            "overlap": 0.02,
            "safety_margin": 0.05
        }
        
        gen_response = client.post("/generate_trajectory", json=trajectory_request)
        assert gen_response.status_code == 200
        trajectory_data = gen_response.json()["trajectory"]
        
        # Now save it
        save_request = {
            "wall_width": 3.0,
            "wall_height": 2.0,
            "obstacles": [],
            "trajectory": trajectory_data
        }
        
        response = client.post("/save_trajectory", json=save_request)
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Trajectory saved successfully"
        assert execution_time < 3.0
    
    def test_get_trajectories(self):
        """Test retrieving saved trajectories"""
        start_time = time.time()
        
        response = client.get("/trajectories?limit=5")
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert "trajectories" in data
        assert "count" in data
        assert isinstance(data["trajectories"], list)
        assert execution_time < 2.0
    
    def test_system_status(self):
        """Test system status endpoint"""
        start_time = time.time()
        
        response = client.get("/system_status")
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"
        assert "statistics" in data
        assert "recent_logs" in data
        assert execution_time < 2.0
    
    def test_invalid_trajectory_request(self):
        """Test invalid trajectory request"""
        invalid_request = {
            "wall_width": -1.0,  # Invalid negative width
            "wall_height": 2.0
        }
        
        response = client.post("/generate_trajectory", json=invalid_request)
        # Should handle gracefully (either 422 validation error or 500 with error message)
        assert response.status_code in [422, 500]
    
    def test_get_messages(self):
        """Test message retrieval endpoint"""
        start_time = time.time()
        
        response = client.get("/messages/robot_status?limit=10")
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert "topic" in data
        assert "messages" in data
        assert "count" in data
        assert data["topic"] == "robot_status"
        assert execution_time < 2.0
    
    def test_process_messages(self):
        """Test message processing endpoint"""
        start_time = time.time()
        
        response = client.post("/process_messages")
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        data = response.json()
        assert "processed_messages" in data
        assert "status" in data
        assert data["status"] == "completed"
        assert execution_time < 3.0

class TestCRUDOperations:
    """Test basic CRUD operations"""
    
    def test_create_and_retrieve_trajectory(self):
        """Test complete CRUD flow: Create -> Read"""
        # CREATE: Generate and save trajectory
        trajectory_request = {
            "wall_width": 2.0,
            "wall_height": 1.5,
            "obstacles": [{"x": 0.5, "y": 0.5, "width": 0.2, "height": 0.2}],
            "tool_width": 0.08,
            "overlap": 0.01,
            "safety_margin": 0.04
        }
        
        # Generate trajectory
        gen_response = client.post("/generate_trajectory", json=trajectory_request)
        assert gen_response.status_code == 200
        trajectory_data = gen_response.json()["trajectory"]
        
        # Save trajectory
        save_request = {
            "wall_width": 2.0,
            "wall_height": 1.5,
            "obstacles": [{"x": 0.5, "y": 0.5, "width": 0.2, "height": 0.2}],
            "trajectory": trajectory_data
        }
        
        save_response = client.post("/save_trajectory", json=save_request)
        assert save_response.status_code == 200
        trajectory_id = save_response.json()["id"]
        
        # READ: Retrieve trajectories
        get_response = client.get("/trajectories?limit=1")
        assert get_response.status_code == 200
        trajectories = get_response.json()["trajectories"]
        assert len(trajectories) >= 1
        
        # Verify our trajectory is in the results
        found_trajectory = any(t["id"] == trajectory_id for t in trajectories)
        assert found_trajectory

class TestPerformance:
    """Test response time requirements"""
    
    def test_trajectory_generation_performance(self):
        """Test trajectory generation stays within acceptable time limits"""
        test_cases = [
            {"wall_width": 1.0, "wall_height": 1.0, "max_time": 2.0},
            {"wall_width": 5.0, "wall_height": 3.0, "max_time": 5.0},
            {"wall_width": 10.0, "wall_height": 4.0, "max_time": 10.0}
        ]
        
        for case in test_cases:
            start_time = time.time()
            
            request_data = {
                "wall_width": case["wall_width"],
                "wall_height": case["wall_height"],
                "obstacles": [],
                "tool_width": 0.1,
                "overlap": 0.02,
                "safety_margin": 0.05
            }
            
            response = client.post("/generate_trajectory", json=request_data)
            execution_time = time.time() - start_time
            
            assert response.status_code == 200
            assert execution_time < case["max_time"], f"Trajectory generation took {execution_time:.2f}s, expected < {case['max_time']}s"
    
    def test_database_operations_performance(self):
        """Test database operations performance"""
        # Test retrieval performance
        start_time = time.time()
        response = client.get("/trajectories?limit=100")
        execution_time = time.time() - start_time
        
        assert response.status_code == 200
        assert execution_time < 1.0, f"Database retrieval took {execution_time:.2f}s, expected < 1.0s"

# Run tests if script is executed directly
if __name__ == "__main__":
    print("Running basic API tests...")
    print("Note: Run with 'pytest test_api.py -v' for detailed output")