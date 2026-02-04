# Collaboration & Sharing API

## Overview

The system supports two-tier sharing:

1. **Public Link Sharing** - Read-only blueprint viewing via shareable tokens
2. **Team Collaboration** - User-to-user project sharing with granular permissions

## Collaborator Roles

| Role | View | Comment | Edit | Manage Team |
|------|------|---------|------|-------------|
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| `commenter` | ✅ | ✅ | ❌ | ❌ |
| `editor` | ✅ | ✅ | ✅ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `owner` | ✅ | ✅ | ✅ | ✅ |

## Endpoints

### 1. Get Project Sharing Settings

```http
GET /api/projects/[projectId]/share
Authorization: Bearer <token>
```

**Response:**
```json
{
  "collaborators": [
    {
      "userId": "uid123",
      "email": "user@example.com",
      "role": "editor",
      "invitedBy": "owner-uid",
      "invitedAt": "2024-01-01T00:00:00Z",
      "acceptedAt": "2024-01-01T01:00:00Z",
      "status": "active"
    }
  ],
  "publicLinkEnabled": true,
  "publicLinkId": "abc123def456"
}
```

---

### 2. Share Project (Invite Collaborator)

```http
POST /api/projects/[projectId]/share
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (Collaborator Invite):**
```json
{
  "userId": "uid456",
  "email": "collaborator@example.com",
  "role": "editor"
}
```

**Request Body (Public Link Toggle):**
```json
{
  "publicLink": true
}
```

**Response (Collaborator Invite):**
```json
{
  "success": true,
  "message": "Collaborator invitation sent"
}
```

**Response (Public Link Enabled):**
```json
{
  "publicLinkEnabled": true,
  "publicLinkId": "abc123def456"
}
```

---

### 3. Remove Collaborator

```http
DELETE /api/projects/[projectId]/share
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": "uid456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Collaborator removed successfully"
}
```

---

### 4. Accept Collaboration Invitation

```http
POST /api/collaborations/accept
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "projectId": "project-abc"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Collaboration invitation accepted",
  "project": {
    "id": "project-abc",
    "name": "My Project",
    "role": "editor"
  }
}
```

---

### 5. Get All Collaborations

```http
GET /api/collaborations
Authorization: Bearer <token>
```

**Response:**
```json
{
  "projects": [
    {
      "id": "project-abc",
      "name": "Owned Project",
      "lastMessage": "Last message preview...",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z"
    },
    {
      "id": "project-xyz",
      "name": "Shared Project",
      "lastMessage": "Another preview...",
      "createdAt": "2024-01-03T00:00:00Z",
      "updatedAt": "2024-01-04T00:00:00Z"
    }
  ],
  "total": 2
}
```

---

### 6. View Shared Blueprint (Public Link)

```http
GET /api/share/[token]
```

**No authentication required**

**Response:**
```json
{
  "blueprint": {
    "id": "blueprint-abc",
    "version": "1.5",
    "status": "locked",
    "content": { /* UBP content */ },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  },
  "project": {
    "projectName": "Example Project",
    "description": "Project description"
  },
  "shareData": {
    "viewCount": 42,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

## Security Notes

1. **Owner-only actions**: Only project owners can invite/remove collaborators
2. **Self-invitation blocked**: Users cannot share projects with themselves
3. **Self-removal blocked**: Owners cannot remove themselves
4. **Invitation required**: Users must be explicitly invited to collaborate
5. **Token validation**: All protected endpoints require valid Firebase auth tokens
6. **Authorization**: Uses `checkProjectAccess()` to verify permissions

## Usage Flow

### Inviting a Collaborator

1. Owner calls `POST /api/projects/[projectId]/share` with userId, email, and role
2. System creates pending invitation in `collaborators` array
3. Invited user receives notification (implement separately)
4. Invited user calls `POST /api/collaborations/accept` with projectId
5. Status changes from "pending" to "active"
6. Collaborator can now access project based on their role

### Creating a Public Link

1. Owner calls `POST /api/projects/[projectId]/share` with `{ publicLink: true }`
2. System creates share token for latest blueprint
3. Owner receives public URL: `https://app.com/share/abc123def456`
4. Anyone with link can view blueprint (read-only)

### Revoking Access

**Remove Collaborator:**
```
DELETE /api/projects/[projectId]/share { userId: "..." }
```

**Disable Public Link:**
```
POST /api/projects/[projectId]/share { publicLink: false }
```

## Database Schema

```typescript
interface ProjectDocument {
  id: string
  userId: string // Owner
  name: string
  collaborators?: ProjectCollaborator[]
  // ... other fields
}

interface ProjectCollaborator {
  userId: string
  email: string
  role: "viewer" | "commenter" | "editor" | "admin"
  invitedBy: string
  invitedAt: Timestamp
  acceptedAt?: Timestamp
  status: "pending" | "active" | "revoked"
}

interface ShareToken {
  token: string // Public share ID
  blueprintId: string
  projectId: string
  createdBy: string
  viewCount: number
  isActive: boolean
  expiresAt: string | null
}
```
