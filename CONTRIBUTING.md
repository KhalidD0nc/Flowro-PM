# Contributing to Flowro

First off, thank you for considering contributing to Flowro! We welcome contributions from the community to help make Flowro a better tool for planning and building AI-generated applications.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We expect all contributors to maintain a welcoming and inclusive environment for everyone.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: version 20 or higher.
- **Git**: for version control.

You will also need:
- A Firebase project with Firestore enabled.
- An OpenRouter API key.
- (Optional) Stitch API key.

### Setting up the environment

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Flowro-PM.git
   cd Flowro-PM
   ```
3. **Install dependencies**:
   ```bash
   npm install
   cd app
   npm install
   ```
4. **Configure Environment Variables**:
   Copy the example environment file and fill in your keys:
   ```bash
   cp app/env.example app/.env.local
   ```
5. **Run the development server**:
   ```bash
   npm run dev
   ```

## Development Workflow

### 1. Create a Branch
Always create a new branch for your feature, bug fix, or documentation update:
```bash
git checkout -b feature/your-feature-name
```
Or for a bug fix:
```bash
git checkout -b fix/your-bug-fix
```

### 2. Make Your Changes
Write your code, following the existing project structure and conventions. Note that Flowro uses:
- Next.js 16.1 App Router
- React 19 + Tailwind CSS 4
- TypeScript 5

Ensure your code is strictly typed and adheres to our validation schemas (Zod).

### 3. Quality Checks
Before submitting your changes, run the linter and build the project to ensure everything passes:
```bash
cd app
npm run lint
npm run build
```
Current expected state:
- `npm run lint` exits successfully (it is okay to have existing warnings, but avoid adding new ones).
- `npm run build` exits successfully.

### 4. Commit Your Changes
Write clear, concise commit messages describing what you changed and why:
```bash
git commit -m "feat: add user profile settings"
```
Or:
```bash
git commit -m "fix: resolve firestore write permission error"
```

### 5. Push and Open a Pull Request
Push your branch to your fork:
```bash
git push origin feature/your-feature-name
```
Then, go to the original Flowro repository and open a Pull Request (PR) against the `main` branch. Provide a clear and detailed description of the changes in your PR.

## Bug Reports and Feature Requests

If you find a bug or have a feature request, please open an issue on GitHub. Include as much detail as possible:
- For bugs: steps to reproduce, expected behavior, actual behavior, and error logs if applicable.
- For features: the problem it solves and a proposed solution or workflow.

Thank you for contributing!
