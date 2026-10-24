/** Only same-origin absolute paths may serve as post-login redirect targets. */
export function sanitizeRedirectTarget(target: string | null): string {
  if (target && target.startsWith("/") && !target.startsWith("//") && !target.startsWith("/\\")) {
    return target;
  }
  return "/";
}
