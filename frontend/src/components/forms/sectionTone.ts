/** Rotating border/background tone styles for form sections in the builder. */

export const sectionToneStyles = [
  {
    border: "border-emerald-200/80 dark:border-emerald-900/55",
    header: "bg-emerald-50/80 dark:bg-emerald-950/25",
    rail: "bg-emerald-500",
    icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  {
    border: "border-sky-200/80 dark:border-sky-900/55",
    header: "bg-sky-50/80 dark:bg-sky-950/25",
    rail: "bg-sky-500",
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  },
  {
    border: "border-amber-200/80 dark:border-amber-900/55",
    header: "bg-amber-50/80 dark:bg-amber-950/25",
    rail: "bg-amber-500",
    icon: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  {
    border: "border-violet-200/80 dark:border-violet-900/55",
    header: "bg-violet-50/80 dark:bg-violet-950/25",
    rail: "bg-violet-500",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  },
  {
    border: "border-rose-200/80 dark:border-rose-900/55",
    header: "bg-rose-50/80 dark:bg-rose-950/25",
    rail: "bg-rose-500",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  },
];

export function getSectionTone(index: number) {
  return sectionToneStyles[index % sectionToneStyles.length];
}
