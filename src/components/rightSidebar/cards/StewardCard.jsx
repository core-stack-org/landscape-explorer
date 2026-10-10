import { ExternalLink } from 'lucide-react';
import { planViewUrl } from './PlanCard';
import { colorBorder, colorBorderSoft, colorSurface, colorInk, colorMuted, colorPrimaryHover, colorPageBg, colorPrimaryLight } from '../sidebarTokens';

export function stewardViewUrl(steward, ctx) {
  const organizationId = steward.organization?.id;
  const slug = (steward.facilitator_name ?? '')
    .replace(/[().]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `/landscape-stewardship/steward-view/${organizationId}/${slug}` +
    `?stateId=${encodeURIComponent(ctx.stateId ?? '')}` +
    `&stateName=${encodeURIComponent(ctx.stateLabel ?? '')}` +
    `&districtId=${encodeURIComponent(ctx.districtId ?? '')}` +
    `&districtName=${encodeURIComponent(ctx.districtLabel ?? '')}`;
}

export default function StewardCard({ steward, ctx }) {
  return (
    <section className="rounded-xl p-4" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={() => window.open(stewardViewUrl(steward, ctx), '_blank')}
          className="text-[15px] font-bold text-left truncate hover:underline"
          style={{ color: colorInk }}
        >
          {steward.facilitator_name}
        </button>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: colorPrimaryLight, color: colorPrimaryHover }}>
          {steward.organization?.name || '--'}
        </span>
      </div>

      <div className="mt-3 rounded-lg" style={{ background: colorPageBg, border: `1px solid ${colorBorder}` }}>
        <div className="flex justify-between items-center px-3 py-2.5">
          <span className="text-[12px]" style={{ color: colorMuted }}>Project</span>
          <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{steward.projects?.[0]?.name || '--'}</span>
        </div>
        <div className="flex justify-between items-center px-3 py-2.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
          <span className="text-[12px]" style={{ color: colorMuted }}>Total plans</span>
          <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{steward.plan_count ?? '--'}</span>
        </div>
      </div>

      <h3 className="text-[10px] font-semibold uppercase tracking-wide mt-3 mb-2" style={{ color: colorMuted }}>Assigned plans</h3>
      <ul className="space-y-2 list-none p-0 m-0">
        {(steward.plans ?? []).map((plan) => (
          <li key={plan.id} className="rounded-lg px-3 py-2.5" style={{ border: `1px solid ${colorBorder}`, background: colorSurface }}>
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold truncate" style={{ color: colorInk }}>{plan.plan}</p>
                <p className="text-[11px] mt-0.5" style={{ color: colorMuted }}>Village: {plan.village_name || '--'}</p>
              </div>
              <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: colorMuted }}>
                {plan.is_completed ? 'Completed' : 'Pending'}
              </span>
            </div>
            {plan.is_completed && (
              <button
                type="button"
                onClick={() => window.open(planViewUrl(plan, ctx), '_blank')}
                className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: colorPrimaryHover }}
              >
                View DPR
                <ExternalLink size={11} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
