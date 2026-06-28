import React from "react";

export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-ocean text-white hover:bg-blue-700",
    secondary: "bg-white text-navy ring-1 ring-slate-200 hover:bg-slate-50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700"
  };

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
