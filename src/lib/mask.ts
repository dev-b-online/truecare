// Client-safe masking helpers for PII in admin views and logs.
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const [name, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".") || "";
  return `${local[0] ?? "*"}***@${name?.[0] ?? "*"}***${tld ? "." + tld[0] : ""}***`;
}

export function maskSecret(value: string | undefined | null, keep = 3): string {
  if (!value) return "";
  if (value.length <= keep * 2) return "•".repeat(value.length);
  return `${value.slice(0, keep)}***${value.slice(-keep)}`;
}

export function maskName(name: string): string {
  if (!name) return "";
  return `${name[0]}${"•".repeat(Math.max(0, name.length - 1))}`;
}
