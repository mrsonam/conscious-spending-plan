/** Same-origin relative path only; blocks `//host`, `/\host` and absolute URLs. */
export function isSafeCallbackPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\")
}
