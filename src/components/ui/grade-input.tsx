import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validateGradeInput } from "@/utils/gradeUtils";
import { useState, useEffect } from "react";

interface GradeInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  maxScore?: number;
  maxGrade?: number;
  value: string | number;
  onChange: (value: string) => void;
  showValidation?: boolean;
}

export const GradeInput = React.forwardRef<HTMLInputElement, GradeInputProps>(
  ({ className, maxScore, maxGrade, value, onChange, showValidation = true, ...props }, ref) => {
    const maxValue = maxScore || maxGrade || 20;
    const [error, setError] = useState<string>("");
    const [hasInteracted, setHasInteracted] = useState(false);

    // Validate input when value or maxValue changes
    useEffect(() => {
      if (hasInteracted && showValidation && value !== "") {
        const validation = validateGradeInput(value, maxValue);
        setError(validation.isValid ? "" : validation.errorMessage || "");
      }
    }, [value, maxValue, hasInteracted, showValidation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setHasInteracted(true);
      
      if (inputValue === "") {
        setError("");
        onChange(inputValue);
        return;
      }

      const validation = validateGradeInput(inputValue, maxValue);
      
      if (validation.isValid) {
        setError("");
        onChange(inputValue); } else {
        // Still allow typing, but show error
        setError(showValidation ? (validation.errorMessage || "") : "");
        onChange(inputValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setHasInteracted(true);
      
      if (e.target.value !== "") {
        const validation = validateGradeInput(e.target.value, maxValue);
        if (!validation.isValid) {
          // Auto-correct to max value if exceeded
          if (parseFloat(e.target.value) > maxValue) {
            onChange(maxValue.toString());
          }
        }
      }
      
      props.onBlur?.(e);
    };

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          type="number"
          min="0"
          max={maxValue}
          step="0.5"
          placeholder={`Note/${maxValue}`}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={cn(
            className,
            error && showValidation && "border-destructive focus-visible:ring-destructive"
          )}
          {...props}
        />
        {error && showValidation && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

GradeInput.displayName = "GradeInput";