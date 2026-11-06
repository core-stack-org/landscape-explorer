import { TAB_LABELS } from './tabRules';
import { colorPrimary, colorInk, colorMuted, colorBorder } from './sidebarTokens';

export default function TabStrip({ tabs, active, onSelect }) {
  return (
    <div
      role="tablist"
      aria-label="Details under the click"
      className="flex overflow-x-auto"
      style={{ borderBottom: `1px solid ${colorBorder}` }}
    >
      {tabs.map((type) => {
        const isActive = type === active;
        return (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelect(type)}
            className="whitespace-nowrap text-[13px] px-[9px] py-[9px] shrink-0"
            style={{
              fontWeight: isActive ? 700 : 500,
              color: isActive ? colorInk : colorMuted,
              borderBottom: `2px solid ${isActive ? colorPrimary : 'transparent'}`,
            }}
          >
            {TAB_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
