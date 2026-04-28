# Templates

Flowro is template-first. AI may generate app-specific implementation details, but it may not invent the base stack.

## V1 Template

`nextjs-app`

- Stack: Next.js, React, TypeScript, Tailwind CSS.
- Package manager: npm.
- Install command: `npm install`.
- Dev command: `npm run dev`.
- Build command: `npm run build`.
- Editable paths: `src/app`, `src/components`, `src/lib`.

## Constraints

- Generate a web application only.
- Preserve the base framework.
- Prefer template conventions over custom architecture.
- Add new templates by extending the template manifest registry before allowing the model to select them.
