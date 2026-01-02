# Flowro AI

> **Unified Blueprint Engine** — Convert messy ideas into structured project blueprints with AI-powered conversations.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![Firebase](https://img.shields.io/badge/Firebase-12.7-orange?logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## Overview

Flowro AI is an intelligent project planning tool that helps you transform unstructured ideas into **Unified Blueprints (UBP)** — structured, version-controlled project documents that serve as the foundation for development.

### Key Features

- 🤖 **AI-Powered Conversations** — Chat with AI to refine your project ideas
- 📋 **Unified Blueprints** — Generate structured project documents
- 🔒 **Blueprint Locking** — Finalize versions while continuing conversations
- 📊 **Project Dashboard** — Manage all your projects in one place
- 🔐 **Firebase Authentication** — Secure user accounts

## Architecture

```
Project (Collection)
├── projectName
├── chatHistory[]        ← Persistent across all blueprint versions
├── createdAt / updatedAt
└── blueprints[]
    ├── version: "0.1", "1.0"
    ├── status: draft | locked | approved
    ├── content
    └── lockedAt
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Auth & Database:** Firebase (Auth + Firestore)
- **Styling:** Tailwind CSS 4
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Flowro-PM.git
cd Flowro-PM/app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local` in the `/app` directory:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List user's projects |
| `/api/projects` | POST | Create new project |
| `/api/blueprints?projectId=xxx` | GET | List blueprints for a project |
| `/api/blueprints` | POST | Create new blueprint version |
| `/api/blueprints` | PATCH | Update content or lock blueprint |
| `/api/generate` | POST | Generate AI response & save to project |

## Project Structure

```
app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── blueprints/    # Blueprint CRUD + auth
│   │   │   ├── generate/      # AI generation endpoint
│   │   │   └── projects/      # Project CRUD
│   │   ├── auth/              # Sign in / Sign up
│   │   ├── dashboard/         # Project dashboard
│   │   └── page.tsx           # Landing page
│   ├── components/
│   └── lib/
│       ├── firebase.ts        # Client SDK
│       └── firebase-admin.ts  # Admin SDK
└── package.json
```

## License

MIT
