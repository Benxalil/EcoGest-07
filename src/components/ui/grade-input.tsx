import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { validateGradeInput } from "@/utils/gradeUtils";
import { useState, useEffect } from "react";

interface GradeInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  maxScore: number;
  value: string | number;
  onChange: (value: string) => void;
  showValidation?: boolean;
}

export const GradeInput = React.forwardRef<HTMLInputElement, GradeInputProps>(
  ({ className, maxScore, value, onChange, showValidation = true, ...props }, ref) => {
    const [error, setError] = useState<string>("");
    const [hasInteracted, setHasInteracted] = useState(false);

    // Validate input when value or maxScore changes
    useEffect(() => {
      if (hasInteracted && showValidation && value !== "") {
        const validation = validateGradeInput(value, maxScore);
        setError(validation.isValid ? "" : validation.errorMessage || "");
      }
    }, [value, maxScore, hasInteracted, showValidation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setHasInteracted(true);
      
      if (inputValue === "") {
        setError("");
        onChange(inputValue);
        return;
      }

      const validation = validateGradeInput(inputValue, maxScore);
      
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
        const validation = validateGradeInput(e.target.value, maxScore);
        if (!validation.isValid) {
          // Auto-correct to max value if exceeded
          if (parseFloat(e.target.value) > maxScore) {
            onChange(maxScore.toString());
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
          max={maxScore}
          step="0.5"
          placeholder={`Note/${maxScore}`}
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