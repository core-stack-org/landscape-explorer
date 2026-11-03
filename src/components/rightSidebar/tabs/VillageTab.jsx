import { ExternalLink } from 'lucide-react';
import {
  colorPrimaryHover, colorInk, colorMuted, colorBorder, colorBorderSoft,
  colorPageBg, colorSurface, colorWater,
} from '../sidebarTokens';

// Most field names are the `source: "village"` filter names in Filters.json —
// confirmed real villageJson keys by the same convention validated for the
// MWS record (filter name == JSON key). Land & water and Institutions &
// public works (NREGA/Collectives only — no confirmed field for the
// Has/Lacks chips yet) were confirmed directly against villageJson. The
// spider chart is skipped — see kyl-sidebar-mws-village-plan.md §5, §8.
const SC_COLOR = '#B86A0B';
const ST_COLOR = '#317DE9';
const OTHER_COLOR = '#DDD6FE';

function isValid(v) {
  return v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0;
}

function Tile({ label, value }) {
  return (
    <div className="rounded-xl px-3 py-2.5 flex-1" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <div className="text-[11px]" style={{ color: colorMuted }}>{label}</div>
      <div className="text-[15px] font-bold mt-0.5" style={{ color: colorInk }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl p-3.5 space-y-2.5" style={{ background: colorSurface, border: `1px solid ${colorBorder}` }}>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colorMuted }}>{title}</h3>
      {children}
    </section>
  );
}

function DistanceRow({ label, km }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
      <span className="text-[12px]" style={{ color: colorMuted }}>{label}</span>
      <span className="text-[12px] font-semibold" style={{ color: colorInk }}>
        {isValid(km) ? `${Number(km).toFixed(1)} km` : '--'}
      </span>
    </div>
  );
}

function DistanceGroup({ title, rows }) {
  const shown = rows.filter((r) => isValid(r.km));
  if (shown.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colorMuted }}>{title}</div>
      <div className="rounded-lg px-2.5" style={{ background: colorPageBg }}>
        {shown.map((r) => <DistanceRow key={r.label} label={r.label} km={r.km} />)}
      </div>
    </div>
  );
}

function Chip({ children }) {
  return (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: colorPageBg, color: colorInk }}>
      {children}
    </span>
  );
}

export default function VillageTab({ record, name: clickedName, villageId, buildVillageReportUrl }) {
  const r = record ?? {};
  // vill_name comes off the clicked vector-tile feature (confirmed real key);
  // villageJson's own name fields are the fallback if that wasn't captured.
  const name = clickedName || r.vill_name || r.village_name || r.name || 'Unknown village';
  const id = villageId ?? r.vill_ID ?? r.village_id ?? '--';

  const totalPopulation = r.total_population;
  const hasPopulation = isValid(totalPopulation) && Number(totalPopulation) > 0;

  // percent_sc_population / percent_st_population are already percentages
  // (Filters.json labels them "Percentage SC/ST population"), not counts.
  const scPct = isValid(r.percent_sc_population) ? Number(r.percent_sc_population) : null;
  const stPct = isValid(r.percent_st_population) ? Number(r.percent_st_population) : null;
  const otherPct = scPct !== null && stPct !== null ? Math.max(0, 100 - scPct - stPct) : null;
  const literacyPct = isValid(r.literacy_level) ? Number(r.literacy_level) : null;

  const withinReach = [
    { label: 'Public distribution system', km: r.public_distribution_system },
    { label: 'Market', km: r.agri_market_access },
    { label: 'Post-harvest processing', km: r.post_harvest_infra },
    { label: 'Primary school', km: r.essential_education_infra },
    { label: 'Health centre', km: r.essential_health_services },
  ];
  const farOff = [
    { label: 'Livestock services', km: r.livestock_management_centers },
    { label: 'Agri inputs & advisory', km: r.agricultural_support_infrastructure },
    { label: 'Farmer cooperative', km: r.farmer_cooperatives_access },
  ];

  const netSown = isValid(r.net_sown_area_in_hac) ? Number(r.net_sown_area_in_hac) : null;
  const cultivable = isValid(r.total_cultivable_area_in_hac) ? Number(r.total_cultivable_area_in_hac) : null;
  const irrigated = isValid(r.area_irrigated_in_hac) ? Number(r.area_irrigated_in_hac) : null;
  const dripFarmers = isValid(r.no_of_farmers_using_drip_sprinkler) ? Number(r.no_of_farmers_using_drip_sprinkler) : null;
  const pipedHouseholds = isValid(r.total_hhd_having_piped_water_connection) ? Number(r.total_hhd_having_piped_water_connection) : null;
  const hasHeadline = netSown !== null && cultivable !== null;
  const sownRatio = hasHeadline && cultivable > 0 ? Math.min(100, (netSown / cultivable) * 100) : 0;
  const irrigatedPctOfSown = irrigated !== null && netSown ? Math.round((irrigated / netSown) * 100) : null;
  const hasLandWater = hasHeadline || irrigated !== null || dripFarmers !== null || pipedHouseholds !== null;

  // Filters.json's own labels have these two swapped relative to their field
  // names (small_animals_total is labelled "Bovines (Cattle/Buffalo) count",
  // large_animals_total "Small Animals (Sheep/Goat/Pig) count") — plan §4.4
  // says to follow the label, not the name, so this binds the labels' way.
  const cattleBuffalo = r.small_animals_total;
  const sheepGoatPig = r.large_animals_total;
  const hasLivestock = isValid(sheepGoatPig) || isValid(cattleBuffalo);
  const livestockTotal = (isValid(sheepGoatPig) ? Number(sheepGoatPig) : 0) + (isValid(cattleBuffalo) ? Number(cattleBuffalo) : 0);

  // HAS/LACKS chips are left out — no confirmed field for them yet.
  const nregaAssets = isValid(r.total_assets) ? Number(r.total_assets) : null;
  const totalShg = isValid(r.total_shg) ? Number(r.total_shg) : null;
  const shgWithLoan = isValid(r.total_shg_accessed_bank_loans) ? Number(r.total_shg_accessed_bank_loans) : null;
  const hasInstitutions = nregaAssets !== null || totalShg !== null || shgWithLoan !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDE9FE' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colorPrimaryHover} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold truncate" style={{ color: colorInk }}>{name}</div>
          <div className="text-[11px]" style={{ color: colorMuted }}>Village {id}</div>
        </div>
      </div>

      {hasPopulation && (
        <Section title="Who lives here">
          <Tile label="Population" value={Number(totalPopulation).toLocaleString()} />

          {scPct !== null && stPct !== null && (
            <div>
              <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: colorBorderSoft }}>
                {scPct > 0 && <div style={{ width: `${scPct}%`, background: SC_COLOR }} />}
                {stPct > 0 && <div style={{ width: `${stPct}%`, background: ST_COLOR }} />}
                {otherPct > 0 && <div style={{ width: `${otherPct}%`, background: OTHER_COLOR }} />}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                <span className="flex items-center gap-1 text-[10px]" style={{ color: colorMuted }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: SC_COLOR }} /> SC {scPct.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: colorMuted }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: ST_COLOR }} /> ST {stPct.toFixed(1)}%
                </span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: colorMuted }}>
                  <span className="w-2 h-2 rounded-sm" style={{ background: OTHER_COLOR }} /> Other {otherPct.toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          {literacyPct !== null && (
            <div className="flex items-center justify-between py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
              <span className="text-[12px]" style={{ color: colorMuted }}>Literacy</span>
              <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{literacyPct.toFixed(1)}%</span>
            </div>
          )}

          <p className="text-[10px]" style={{ color: colorMuted}}>
            Population and social data: Census 2011.
          </p>
        </Section>
      )}

      {(withinReach.some((d) => isValid(d.km)) || farOff.some((d) => isValid(d.km))) && (
        <Section title="How far to things">
          <DistanceGroup title="Within reach" rows={withinReach} />
          <DistanceGroup title="A long way off" rows={farOff} />
        </Section>
      )}

      {hasLandWater && (
        <Section title="Land & water">
          {hasHeadline && (
            <div>
              <p className="text-[12px]" style={{ color: colorInk }}>
                <strong>{netSown.toLocaleString()} ha</strong> sown in Kharif, of <strong>{cultivable.toLocaleString()} ha</strong> cultivable.
              </p>
              <div className="w-full h-2 rounded-full overflow-hidden mt-2" style={{ background: colorBorderSoft }}>
                <div className="h-full rounded-full" style={{ width: `${sownRatio}%`, background: colorWater }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1" style={{ color: colorMuted }}>
                <span>Kharif sown {netSown.toLocaleString()} ha</span>
                <span>Cultivable {cultivable.toLocaleString()} ha</span>
              </div>
            </div>
          )}

          {irrigated !== null && (
            <div className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: colorPageBg }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colorWater} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2.5C8 8 5 11.5 5 15a7 7 0 0 0 14 0c0-3.5-3-7-7-12.5Z" />
              </svg>
              <span className="text-[12px]" style={{ color: colorInk }}>
                <strong>{irrigated.toLocaleString()} ha</strong> irrigated{irrigatedPctOfSown !== null ? ` — ${irrigatedPctOfSown}% of sown land` : ''}
              </span>
            </div>
          )}

          {(dripFarmers !== null || pipedHouseholds !== null) && (
            <div className="flex flex-wrap gap-1.5">
              {dripFarmers !== null && <Chip>{dripFarmers.toLocaleString()} farmers using drip / sprinkler</Chip>}
              {pipedHouseholds !== null && <Chip>{pipedHouseholds.toLocaleString()} piped water connections</Chip>}
            </div>
          )}
        </Section>
      )}

      {hasLivestock && (
        <Section title="Livestock">
          <div className="flex gap-2">
            <Tile label="Cattle & buffalo" value={isValid(cattleBuffalo) ? Number(cattleBuffalo).toLocaleString() : '--'} />
            <Tile label="Sheep / goat / pig" value={isValid(sheepGoatPig) ? Number(sheepGoatPig).toLocaleString() : '--'} />
          </div>
          <div className="flex items-center justify-between py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
            <span className="text-[12px]" style={{ color: colorMuted }}>All livestock</span>
            <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{livestockTotal.toLocaleString()}</span>
          </div>
          {isValid(r.livestock_management_centers) && (
            <div className="flex items-center justify-between py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
              <span className="text-[12px]" style={{ color: colorMuted }}>Nearest veterinary & husbandry service</span>
              <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{Number(r.livestock_management_centers).toFixed(1)} km</span>
            </div>
          )}
        </Section>
      )}

      {hasInstitutions && (
        <Section title="Institutions & public works">
          {nregaAssets !== null && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colorMuted }}>NREGA · 2016–2025</div>
              <div className="flex items-center justify-between py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
                <span className="text-[12px]" style={{ color: colorMuted }}>Assets built</span>
                <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{nregaAssets.toLocaleString()}</span>
              </div>
            </div>
          )}

          {(totalShg !== null || shgWithLoan !== null) && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: colorMuted }}>Collectives</div>
              {totalShg !== null && (
                <div className="flex items-center justify-between py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
                  <span className="text-[12px]" style={{ color: colorMuted }}>Self-help groups</span>
                  <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{totalShg.toLocaleString()}</span>
                </div>
              )}
              {shgWithLoan !== null && (
                <div className="flex items-center justify-between py-1.5" style={{ borderTop: `1px solid ${colorBorderSoft}` }}>
                  <span className="text-[12px]" style={{ color: colorMuted }}>SHGs with a bank loan</span>
                  <span className="text-[12px] font-semibold" style={{ color: colorInk }}>{shgWithLoan.toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </Section>
      )}

      {buildVillageReportUrl && villageId != null && (
        <a
          href={buildVillageReportUrl(villageId)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold"
          style={{ border: `1px solid ${colorBorder}`, color: colorPrimaryHover }}
        >
          <ExternalLink size={14} />
          Read the full village report
        </a>
      )}
    </div>
  );
}
