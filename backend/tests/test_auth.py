"""
Unit tests for Authentication & Role Determination
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_worker_login_success():
    response = client.post("/api/auth/login", json={
        "username": "EMP1024",
        "password": "1234"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "WORKER"
    assert data["user"]["username"] == "EMP1024"
    assert data["user"]["name"] == "Rajesh Kumar"
    assert data["user"]["active_badge_id"] is not None

def test_supervisor_login_success():
    response = client.post("/api/auth/login", json={
        "username": "SUP001",
        "password": "1234"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["role"] == "SUPERVISOR"
    assert data["user"]["username"] == "SUP001"
    assert data["user"]["name"] == "Arun Nair"

def test_invalid_login_credentials():
    response = client.post("/api/auth/login", json={
        "username": "INVALID_USER",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]

def test_session_restoration_and_logout():
    # 1. Login
    login_res = client.post("/api/auth/login", json={
        "username": "EMP1024",
        "password": "1234"
    })
    token = login_res.json()["token"]

    # 2. Verify /me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "WORKER"

    # 3. Logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # 4. Verify /me now fails
    me_after = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_after.status_code == 401
