import { ExternalLink } from 'lucide-react';
import { colorBorder, colorBorderSoft, colorSurface, colorInk, colorMuted, colorPrimaryHover, colorPageBg } from '../sidebarTokens';

// Same content as the former inline plan card; no back control (the detail shell owns it).
export function planViewUrl(plan, ctx) {
  return `/landscape-stewardship/plan-view?id=${plan.id}` +
    `&completed=${!!plan.is_completed}` +
    `&dpr_reviewed=${!!plan.is_dpr_reviewed}` +
    `&dpr_generated=${!!plan.is_dpr_generated}` +
    `&dpr_approved=${!!plan.is_dpr_approved}` +
    `&stateId=${encodeURIComponent(ctx.stateId ?? '')}&stateName=${encodeURIComponent(ctx.stateLabel ?? '')}` +
    `&districtId=${encodeURIComponent(ctx.districtId ?? '')}&districtName=${encodeURIComponent(ctx.districtLabel ?? '')}`;
}

export default function PlanCard({ plan, ctx }) {
  const rows = [
    ['Village', plan.village_name],
    ['Steward', plan.facilitator_name],
    ['Organization', plan.organization_name],
  ];
  return (
    <section className="rounded-xl p-4" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <h2 className="text-[15px] font-bold truncate" style={{ color: colorPrimaryHover }}>{plan.plan}</h2>
      <div className="mt-3 rounded-lg" style={{ background: colorPageBg, border: `1px solid ${colorBorder}` }}>
        {rows.map(([label, value], i) => (
          <div key={label} className="flex justify-between items-center px-3 py-2.5" style={{ borderTop: i ? `1px solid ${colorBorderSoft}` : 'none' }}>
            <span className="text-[12px]" style={{ color: colorMuted }}>{label}</span>
            <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{value || '--'}</span>
          </div>
        ))}
      </div>
      {plan.is_dpr_reviewed && (
        <button
          type="button"
          onClick={() => window.open(planViewUrl(plan, ctx), '_blank')}
          className="mt-3 flex items-center gap-2 text-[12px] font-semibold"
          style={{ color: colorPrimaryHover }}
        >
          <ExternalLink size={14} aria-hidden="true" />
          View DPR
        </button>
      )}
    </section>
  );
}
