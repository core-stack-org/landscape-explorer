const Loader = ({
  label = "Loading...",
  size = "md",
  inline = false,
  variant = "spinner",
  className = "",
}) => {
  const sizeMap = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-[3px]",
  };

  if (variant === "skeleton") {
    return (
      <div
        className={`ui-fade-in ${inline ? "" : "w-full"} ${className}`}
        aria-label={label}
        aria-live="polite"
        role="status"
      >
        <div className="space-y-2">
          <div className="ui-skeleton h-4 rounded-full" />
          <div className="ui-skeleton h-4 w-5/6 rounded-full" />
          <div className="ui-skeleton h-4 w-2/3 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ui-fade-in ${inline ? "inline-flex" : "flex"} items-center justify-center gap-3 ${className}`}
      aria-label={label}
      aria-live="polite"
      role="status"
    >
      <span
        className={`${sizeMap[size]} animate-spin rounded-full border-violet-200 border-t-violet-600`}
        aria-hidden="true"
      />
      {label ? <span className="text-sm text-gray-600">{label}</span> : null}
    </div>
  );
};

export default Loader;
