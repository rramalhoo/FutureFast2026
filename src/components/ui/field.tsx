import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./input";

type FieldProps = {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string | string[];
  required?: boolean;
  className?: string;
  children: React.ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean; id?: string }>;
};

/** Agrupa rótulo, controle, dica e erro com associações ARIA corretas. */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  const errorText = Array.isArray(error) ? error[0] : error;
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = errorText ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </Label>
      {React.cloneElement(children, {
        id: htmlFor,
        "aria-describedby": describedBy,
        "aria-invalid": errorText ? true : undefined,
      })}
      {hint && !errorText ? (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {errorText ? (
        <p id={errorId} role="alert" className="text-caption font-medium text-danger-foreground">
          {errorText}
        </p>
      ) : null}
    </div>
  );
}
