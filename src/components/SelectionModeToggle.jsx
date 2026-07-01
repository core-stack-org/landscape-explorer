const SelectionModeToggle = ({
  selectionMode,
  setSelectionMode,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex h-[42px]">
      <button
        type="button"
        onClick={() => setSelectionMode("single")}
        className={`px-4 text-sm font-medium transition-all duration-200 ${
          selectionMode === "single"
            ? "bg-indigo-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        Single
      </button>

      <button
        type="button"
        onClick={() => setSelectionMode("multi")}
        className={`px-4 text-sm font-medium transition-all duration-200 ${
          selectionMode === "multi"
            ? "bg-indigo-600 text-white"
            : "bg-white text-gray-600 hover:bg-gray-50"
        }`}
      >
        Multi
      </button>
    </div>
  );
};

export default SelectionModeToggle;