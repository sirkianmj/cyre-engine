/**
 * Validation helpers for cyber entities.
 */

/**
 * Validates an IPv4 address string.
 * Returns true if the address is a valid IPv4 (0.0.0.0 to 255.255.255.255).
 */
function isValidIPv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validates an IPv6 address string.
 * This is a simplified validator that checks the format is plausible.
 */
function isValidIPv6(ip: string): boolean {
  if (!/^[0-9a-fA-F:]+$/.test(ip)) return false;
  // Must contain at least one colon and not contain more than 7 colons in basic form
  const colonCount = (ip.match(/:/g) || []).length;
  if (colonCount < 1 || colonCount > 7) return false;
  // Reject empty segments except for :: compression
  const segments = ip.split(':');
  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === '') {
      if (i !== 0 && i !== segments.length - 1 && !ip.includes('::')) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Validates an optional IP address.
 * Throws if the address is invalid.
 */
export function validateOptionalIpAddress(ip: string): void {
  if (!isValidIPv4(ip) && !isValidIPv6(ip)) {
    throw new Error(`Invalid IP address: "${ip}".`);
  }
}

/**
 * Validates an optional hostname.
 */
export function validateOptionalHostname(hostname: string): void {
  if (hostname.trim() === '') {
    throw new Error('Hostname cannot be empty.');
  }
  if (hostname.length > 253) {
    throw new Error('Hostname exceeds maximum length.');
  }
}
