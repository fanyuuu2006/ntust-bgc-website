import type { HTMLAttributes, ReactNode } from "react";

type CalendarSurfaceProps = HTMLAttributes<HTMLElement> & { children: ReactNode };

export function CalendarSurface({ children, className, ...props }: CalendarSurfaceProps) {
  return <section {...props} className={`event-calendar-layout${className ? ` ${className}` : ""}`}>{children}</section>;
}
