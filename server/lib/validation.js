import { InputError } from "./errors.js";

// Tool handlers use these helpers instead of open-coded parsing so bad inputs
// always become INVALID_INPUT responses with a clear message.
export function stringArg(args, name) {
  const value = String(args[name] ?? "").trim();
  if (!value) throw new InputError(`${name} is required`);
  return value;
}

export function integerArg(args, names, fallback, { min = 0, max } = {}) {
  const keys = Array.isArray(names) ? names : [names];
  const key = keys.find((candidate) => args[candidate] !== undefined && args[candidate] !== null && args[candidate] !== "");
  const label = keys[0];
  const value = key ? args[key] : fallback;

  if (value === undefined || value === null || value === "") return fallback;

  const number = Number(value);
  if (!Number.isInteger(number) || number < min) {
    throw new InputError(`${label} must be an integer greater than or equal to ${min}`);
  }
  return max === undefined ? number : Math.min(number, max);
}

export function booleanArg(args, names, fallback = false) {
  const keys = Array.isArray(names) ? names : [names];
  const key = keys.find((candidate) => args[candidate] !== undefined && args[candidate] !== null);
  if (!key) return fallback;
  const value = args[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return Boolean(value);
}
