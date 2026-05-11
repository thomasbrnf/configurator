// Format: moduleId-counter-timestamp(13 digits)-random(9 alphanumeric)
const INSTANCE_SUFFIX_RE = /^[a-z0-9]{9}$/;
const TIMESTAMP_RE = /^\d{13}$/;
const COUNTER_RE = /^\d+$/;

export function extractBaseModuleId(id: string): string {
  const parts = id.split('-');

  if (parts.length >= 4) {
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];
    const thirdLast = parts[parts.length - 3];

    if (
      INSTANCE_SUFFIX_RE.test(last) &&
      TIMESTAMP_RE.test(secondLast) &&
      COUNTER_RE.test(thirdLast)
    ) {
      return parts.slice(0, -3).join('-');
    }
  }

  // Fallback for old 2-segment suffix format
  if (parts.length >= 3) {
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];
    if (INSTANCE_SUFFIX_RE.test(last) && TIMESTAMP_RE.test(secondLast)) {
      return parts.slice(0, -2).join('-');
    }
  }

  return id;
}

export function generateInstanceId(baseId: string, counter: number): string {
  return `${baseId}-${counter}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
