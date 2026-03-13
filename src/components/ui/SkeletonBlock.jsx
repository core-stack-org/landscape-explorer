import React from "react";

export default function SkeletonBlock({
  width = "100%",
  height = 16,
  rounded = false,
  className = "",
}) {
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  };

  return (
    <div
      className={`bg-slate-200/80 overflow-hidden relative ${
        rounded ? "rounded-full" : "rounded-md"
      } ${className}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-[skeleton_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-slate-100/80 to-transparent" />
    </div>
  );
}

