export type EditIntentType = "targeted_edit" | "new_feature" | "full_rebuild" | "discussion"

const FULL_REBUILD_PATTERNS = [
  /start\s+over/i,
  /rebuild\s+(the\s+)?app/i,
  /recreate\s+everything/i,
  /from\s+scratch/i,
  /completely\s+(redo|recreate|rewrite)/i,
]

const NEW_FEATURE_PATTERNS = [
  /add\s+(a\s+)?new\s+(page|screen|route|section|feature|tab)/i,
  /create\s+(a\s+)?new\s+(page|screen|route|section|component)/i,
  /implement\s+(a\s+)?new/i,
  /add\s+(authentication|auth|login|signup|register|database|api|integration|chart|graph|table)/i,
  /build\s+(a\s+)?(page|screen|dashboard|form|modal|dialog)/i,
]

const TARGETED_EDIT_PATTERNS = [
  /change\s+(the\s+)?(color|background|font|size|style|text|label|title|heading|button|icon|border|shadow|padding|margin|spacing)/i,
  /update\s+(the\s+)?(color|background|font|size|style|text|label|title|heading|button|icon)/i,
  /fix\s+(the\s+)?(color|background|font|size|style|layout|spacing|margin|padding|border|button|nav|header|footer|alignment)/i,
  /make\s+it\s+(dark|light|blue|red|green|white|black|bigger|smaller|wider|narrower|bold|italic|centered|left|right)/i,
  /make\s+the\s+\w+\s+(bigger|smaller|wider|narrower|bold|italic|centered|blue|red|green|white|black|dark|light)/i,
  /remove\s+(the\s+)\w/i,
  /hide\s+(the\s+)\w/i,
  /rename\s+/i,
  /replace\s+the\s+(text|label|title|heading|button|icon)/i,
  /set\s+(the\s+)?(title|heading|text|label|color|background)\s+to/i,
  /change\s+.+\s+to\s+/i,
]

export function classifyEditIntent(message: string): EditIntentType {
  for (const pattern of FULL_REBUILD_PATTERNS) {
    if (pattern.test(message)) return "full_rebuild"
  }

  for (const pattern of NEW_FEATURE_PATTERNS) {
    if (pattern.test(message)) return "new_feature"
  }

  for (const pattern of TARGETED_EDIT_PATTERNS) {
    if (pattern.test(message)) return "targeted_edit"
  }

  return "discussion"
}
