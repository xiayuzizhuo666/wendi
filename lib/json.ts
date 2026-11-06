import { jsonrepair } from "jsonrepair";

export function parseJsonLoose<T = unknown>(raw: string): T {
  let text = raw.trim();

  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const firstObject = text.indexOf("{");
  const firstArray = text.indexOf("[");
  const start =
    firstObject === -1 ? firstArray : firstArray === -1 ? firstObject : Math.min(firstObject, firstArray);
  if (start > 0) text = text.slice(start);

  const lastObject = text.lastIndexOf("}");
  const lastArray = text.lastIndexOf("]");
  const end = Math.max(lastObject, lastArray);
  if (end >= 0 && end < text.length - 1) text = text.slice(0, end + 1);

  try {
    return JSON.parse(text) as T;
  } catch {
    return JSON.parse(jsonrepair(text)) as T;
  }
}

export function extractString(text: string): string {
  return text.trim().replace(/^```(?:json|text|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
