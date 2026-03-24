import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-[#2E2E2E] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full px-4 py-3 rounded-xl border bg-[#F7F6F2]/50 text-[#2E2E2E] placeholder:text-[#2E2E2E]/30 transition-all focus:outline-none focus:ring-2 focus:ring-[#3A7D44]/30 focus:border-[#3A7D44]",
            error ? "border-red-400 focus:ring-red-200 focus:border-red-400" : "border-gray-200",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
