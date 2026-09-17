import type { GameRecord } from "./types";

function encodeUtf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeUtf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function serialiseGame(record: GameRecord): string {
  return encodeUtf8(JSON.stringify(record));
}

export function deserialiseGame(encoded: string): GameRecord {
  const parsed: unknown = JSON.parse(decodeUtf8(encoded));
  if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1) {
    throw new Error("Unsupported game record");
  }
  return parsed as GameRecord;
}
