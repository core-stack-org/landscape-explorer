import DetailHost from './DetailHost';
import { hasAnyHit } from './tabRules';
import MwsTab from './tabs/MwsTab';
import VillageTab from './tabs/VillageTab';
import WaterbodyTab from './tabs/WaterbodyTab';
import FarmDetailsPanel from '../farmDetails/FarmDetailsPanel';
import PlanCard from './cards/PlanCard';
import StewardCard from './cards/StewardCard';

// Layout shell. Shows ScopePanel when no hit exists, otherwise the detail area.
// Every value arrives as a prop; this component reads no Recoil state itself,
// so it can be rendered and tested with plain data.
export default function RightSidebar({
  hits,
  activeTab,
  onSelectTab,
  onBack,
  layersOn,
  onEnableLayer,
  scope,
  mws,
  village,
  farm,
  ctx,
}) {
  const anyHit = hasAnyHit(hits);
  if (!anyHit) return <div className="flex flex-col gap-2">{scope}</div>;

  const mwsUid = hits.mws?.uid;
  const placeName = mwsUid ? `Micro-watershed ${mwsUid}` : 'Selected location';

  const renderBody = (type) => {
    if (type === 'mws' && hits.mws) return <MwsTab {...mws} uid={hits.mws.uid} />;
    if (type === 'village' && hits.village) return <VillageTab {...village} />;
    if (type === 'farm' && hits.farm) {
      return (
        <FarmDetailsPanel
          {...farm}
          farmId={hits.farm.farmId}
          frequency={hits.farm.properties?.frequency}
          intensity={hits.farm.properties?.intensity}
        />
      );
    }
    if (type === 'waterbody' && hits.waterbody) {
      const wb = hits.waterbody;
      return <WaterbodyTab waterbody={{ id: wb.id, properties: wb.properties, dashboardUrl: ctx.waterbodyUrl?.(wb.id) }} />;
    }
    return null;
  };

  const cards = (
    <>
      {hits.plan && <PlanCard plan={hits.plan.data} ctx={ctx} />}
      {hits.steward && <StewardCard steward={hits.steward.data} ctx={ctx} />}
    </>
  );

  return (
    <div className="flex flex-col gap-2">
      <DetailHost
        hits={hits}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onBack={onBack}
        layersOn={layersOn}
        onEnableLayer={onEnableLayer}
        renderBody={renderBody}
        placeName={placeName}
        mwsId={mwsUid}
        cards={cards}
      />
    </div>
  );
}
