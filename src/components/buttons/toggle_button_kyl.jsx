const ToggleButton = ({isOn, toggleSwitch}) => {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleSwitch}
        className={`relative w-10 h-5 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isOn ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={isOn}
      >
        <span className="sr-only">Toggle switch</span>
        <div
          className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
            isOn ? 'transform translate-x-5' : ''
          }`}
        />
      </button>
      <span className="text-xs font-medium">
        Visualize
      </span>
    </div>
  );
};

export default ToggleButton;