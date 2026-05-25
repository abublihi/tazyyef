import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const HTML_ESCAPE_MAP = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#x27;"],
  ["/", "&#x2F;"],
]);

export function esc(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"'\/]/g, (char) => HTML_ESCAPE_MAP.get(char) ?? char);
}

export function formatTime(iso) {
  return new Date(iso).toLocaleString();
}

export const methodColors = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
  PATCH: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  OPTIONS: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function statusColor(code) {
  if (code < 300) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (code < 400) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  if (code < 500) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}
