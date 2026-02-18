const ToggleButton = ({isOn, toggleSwitch}) => {
  return (
    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm hover:shadow transition-shadow">
      <span className="text-xs font-medium text-gray-700">
        Visualize
      </span>
      <button
        onClick={toggleSwitch}
        className={`relative w-9 h-5 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
          isOn ? 'bg-blue-600' : 'bg-gray-300'
        }`}
        role="switch"
        aria-checked={isOn}
      >
        <span className="sr-only">Toggle visualization</span>
        <div
          className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${
            isOn ? 'transform translate-x-4' : ''
          }`}
        />
      </button>
    </div>
  );
};

export default ToggleButton;