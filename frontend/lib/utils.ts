import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn: standard clsx + tailwind-merge helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
