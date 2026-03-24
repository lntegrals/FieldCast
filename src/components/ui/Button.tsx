import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[#3A7D44] hover:bg-[#3A7D44]/90 text-white shadow-sm",
  secondary:
    "border border-gray-300 bg-white hover:bg-gray-50 text-[#2E2E2E]",
  accent:
    "bg-[#DFAF2B] hover:bg-[#DFAF2B]/90 text-[#2E2E2E] shadow-sm",
  danger:
    "bg-red-600 hover:bg-red-700 text-white shadow-sm",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
