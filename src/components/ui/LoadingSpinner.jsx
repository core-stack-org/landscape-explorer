import React from "react";

export default function LoadingSpinner({ size = 24, label = "Loading" }) {
  const dimension = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className="inline-flex items-center justify-center"
      role="status"
      aria-label={label}
    >
      <span
        className="rounded-full border-2 border-slate-200 border-t-purple-500 animate-spin"
        style={{ width: dimension, height: dimension }}
      />
    </div>
  );
}

