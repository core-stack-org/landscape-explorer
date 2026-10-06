import { AreaIcon } from './icons';
import { hectaresToAcres, isValid } from './farmDetailsUtils';
import { colorBorder, colorSurface, colorInk, colorFaint, colorPrimary } from './farmDetailsTokens';

export default function FieldSizeCard({ areaInHa }) {
  const hasArea = isValid(areaInHa);
  return (
    <section className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <AreaIcon size={16} stroke={colorPrimary} />
      <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: colorFaint }}>Field size</div>
      <div className="ml-auto flex items-baseline gap-2">
        <span className="text-[16px] font-bold" style={{ color: colorInk }}>
          {hasArea ? `${Number(areaInHa).toFixed(2)} ha` : '--'}
        </span>
        {hasArea && (
          <span className="text-[12px]" style={{ color: colorFaint }}>
            about {hectaresToAcres(areaInHa).toFixed(1)} acres
          </span>
        )}
      </div>
    </section>
  );
}
