from pydantic import BaseModel, Field
from typing import List, Dict, Any


class Obstacle(BaseModel):
    x: float
    y: float
    width: float
    height: float

class TrajectoryRequest(BaseModel):
    wall_width: float = Field(gt=0, description="Wall width must be positive")
    wall_height: float = Field(gt=0, description="Wall height must be positive") 
    obstacles: List[Obstacle] = []
    tool_width: float = Field(default=0.1, gt=0, description="Tool width must be positive")
    overlap: float = Field(default=0.02, ge=0, description="Overlap must be non-negative")
    safety_margin: float = Field(default=0.05, ge=0, description="Safety margin must be non-negative")

class TrajectoryPoint(BaseModel):
    x: float
    y: float
    angle: float = 0.0
    speed: float = 0.1
    tool_active: bool = True  # NEW FLAG!

class SaveTrajectoryRequest(BaseModel):
    wall_width: float
    wall_height: float
    obstacles: List[Dict[str, Any]]
    trajectory: List[Dict[str, float]]