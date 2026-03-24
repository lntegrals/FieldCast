import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type Variant = "default" | "success" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-gray-100 text-[#2E2E2E]/70",
  success: "bg-[#3A7D44]/10 text-[#3A7D44]",
  warning: "bg-[#DFAF2B]/15 text-[#DFAF2B]",
  danger: "bg-red-100 text-red-700",
};

export default function Badge({
  variant = "default",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
