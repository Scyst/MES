---
name: planner-agent-api
description: "Allows Agents to interact with the MES Team Planner (Read Timeline, Create Tasks, Update Status) directly via API."
---

# Planner Agent API (MES Team Planner)

This skill provides instructions for Agents to programmatically interact with the MES Team Planner system on behalf of the user. You can use this to report progress, add TODO items, or fetch the user's current workload.

## API Endpoint
**URL:** `https://oem.sncformer.com/iot-toolbox/sandbox-b9/Toolbox/plannerAgent/api/agent_api.php`
*(Note: Use `plannerAgent` for testing/agents, and `planner` for production once fully migrated.)*

## Authentication
The API currently bypasses session authentication for internal agent use. Instead, you MUST provide the `user` parameter to identify the target user. 
**Important:** Use the user's AKA (e.g., `Oat` instead of `Scyst`) if they have specified one, so it matches the UI displays.

---

## 1. Get User's Timeline
Retrieves all ongoing tasks and projects assigned to the user.

- **Method:** `GET`
- **Query Params:**
  - `action=get_timeline`
  - `user=Oat` (Replace with actual user AKA)
- **Example Usage (curl):**
  ```bash
  curl -k "https://oem.sncformer.com/iot-toolbox/sandbox-b9/Toolbox/plannerAgent/api/agent_api.php?action=get_timeline&user=Oat"
  ```
- **Response Shape:**
  ```json
  {
    "success": true,
    "data": {
      "tasks": [ ... ],
      "projects": [ ... ],
      "fetched_for_user": "Oat"
    }
  }
  ```

---

## 2. Create a New Task
Creates a new task in the planner.

- **Method:** `POST`
- **Query Params:**
  - `action=create_task`
  - `user=Oat` (Crucial for fallback ownership)
- **Content-Type:** `application/json`
- **Payload Structure:**
  ```json
  {
    "title": "Fix Database Indexes",
    "description": "Found slow queries on the dashboard.",
    "assignee": "Oat",
    "startDate": "2026-08-17",
    "startTime": "14:00",
    "dueDate": "2026-08-17",
    "endTime": "17:05",
    "status": "todo",
    "priority": "high",
    "tags": "Database,Optimization",
    "spaceId": 1,
    "subtasks": [
      {"id": "c1", "title": "Analyze query plan", "completed": false},
      {"id": "c2", "title": "Add index to users table", "completed": false}
    ]
  }
  ```
- **Example Usage (PHP context):**
  Use `curl` or `http_request` MCP tool with the JSON payload. Ensure `&user=Oat` is in the URL to satisfy the API check.

## Agent Protocol Guidelines
1. **Always check the timeline first:** Before creating a new task, fetch the timeline to ensure you aren't creating a duplicate task.
2. **Be Descriptive:** When creating a task, add enough context in the `description` so the user knows *why* the Agent created it.
3. **Use Checklists:** Break down complex agent tasks into `checklist` items so the user can see step-by-step what the Agent intends to do or has done.
