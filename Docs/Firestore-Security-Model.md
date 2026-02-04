# Firestore Security Rules - Collaborator Model

## Security Architecture

Due to Firestore Rules v2 limitations (no array iteration, no lambda functions), we implement a **hybrid security model**:

### **Firestore Rules Layer** (Basic Access Control)
- ✅ Authentication enforcement
- ✅ Owner-only deletion
- ✅ Owner-only collaborator management
- ✅ Prevent unauthorized project creation

### **Application Layer** (Granular Permissions)
- ✅ Collaborator role validation (viewer, commenter, editor, admin)
- ✅ Active status checking
- ✅ Permission enforcement via `checkProjectAccess()`

## Current Rules Behavior

### Projects Collection
```
READ: Any authenticated user (app validates collaborator status)
CREATE: Authenticated user (sets self as owner)
UPDATE: Owner only (app layer enforces editor/admin edits)
DELETE: Owner only
```

### Messages Subcollection  
```
READ: Any authenticated user with project access
CREATE: Any authenticated user (app validates editor permission)
UPDATE: Never (immutable)
DELETE: Owner only
```

### Blueprints Collection
```
READ: Any authenticated user with project access
CREATE: Owner only (enforces 1:1 with projectId)
UPDATE: Owner only (app validates editor permission)
DELETE: Owner only
```

### Share Tokens
```
READ: Public (anyone with token)
CREATE: Authenticated users
UPDATE/DELETE: Token creator only
```

## Why This Approach?

**Firestore Rules Limitations:**
- Cannot iterate arrays to check `collaborators[].userId == auth.uid`
- No lambda/predicate functions (no `.exists()`, `.filter()`, etc.)
- Cannot access array elements by index or search

**Security Trade-off:**
- ✅ Rules enforce authentication and ownership
- ✅ Application code enforces fine-grained permissions  
- ✅ API routes use `checkProjectAccess()` before operations
- ✅ Admin SDK bypasses rules, so API validation is critical

## Application-Layer Security (CRITICAL)

All API routes MUST call these before operations:

```typescript
// Check access (any role)
const access = await checkProjectAccess(projectId, userId)
if (!access.hasAccess) throw new Error("Access denied")

// Check edit permission
if (!access.canEdit) throw new Error("No edit permission")

// Check admin permission
if (!access.canAdmin) throw new Error("No admin permission")
```

## Implemented Routes with Validation

✅ `/api/blueprints` - Validates owner before PATCH operations  
✅ `/api/projects/[projectId]/share` - Owner-only collaborator management  
✅ `/api/collaborations/accept` - Validates invitation exists  

## Future Enhancements

If Firestore adds array query support or you need stricter rules:

**Option 1:** Create a separate `projectAccess` collection:
```
/projectAccess/{userId_projectId} {
  userId: string
  projectId: string
  role: string
  status: string
}
```
Then rules can do: `exists(/databases/.../projectAccess/$(request.auth.uid_projectId))`

**Option 2:** Use Firebase Security Rules v3 (when available) with better array support

## Testing Security

```bash
# Install Firebase emulator
npm install -g firebase-tools

# Test rules
firebase emulators:start --only firestore

# Run security tests
npm run test:security
```

## Deployment

```bash
firebase deploy --only firestore:rules
```

## Verification Checklist

- [x] Authentication required for all operations
- [x] Owner-only project deletion
- [x] Owner-only collaborator management  
- [x] Application validates collaborator permissions
- [x] 1:1 blueprint-project enforcement
- [x] Immutable messages and history
- [x] Public share tokens read-only
- [x] Removed obsolete `projectShares` collection
