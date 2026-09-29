import { Loader2, X, ChevronDown } from 'lucide-react';
import FarmYearlyView from './FarmYearlyView';
import FarmMonthlyView from './FarmMonthlyView';
import { colorBorder, colorPrimaryLight, colorTextPrimary, colorTextSecondary, colorTextMuted, colorConfidenceLow } from './farmDetailsTokens';

export default function FarmDetailsPanel({ farmId, annual, monthly, loading, error, view, setView, selectedYear, setSelectedYear, onClose }) {
  const availableYears = (annual || []).map((r) => r.year);

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: `1px solid ${colorBorder}` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold" style={{ color: colorTextPrimary }}>Farm Details</h3>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: colorTextSecondary }}>Farm ID &nbsp;{farmId || '--'}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
          style={{ color: colorTextSecondary }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-lg p-[3px]" style={{ background: colorPrimaryLight }}>
          {['yearly', 'monthly'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold capitalize transition-colors ${view === v ? 'bg-white shadow-sm' : ''}`}
              style={{ color: view === v ? colorTextPrimary : colorTextSecondary }}
            >
              {v}
            </button>
          ))}
        </div>

        {availableYears.length > 0 && (
          <div className="relative">
            <select
              value={selectedYear ?? ''}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none text-[11px] font-semibold rounded-lg pl-2.5 pr-7 py-1.5 bg-white"
              style={{ border: `1px solid ${colorBorder}`, color: colorTextPrimary }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: colorTextSecondary }} />
          </div>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10" style={{ color: colorTextMuted }}>
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <p className="text-[11px]">Loading farm details&hellip;</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-center" style={{ color: colorConfidenceLow }}>
            {error}
          </div>
        ) : view === 'yearly' ? (
          <FarmYearlyView annual={annual} selectedYear={selectedYear} />
        ) : (
          <FarmMonthlyView annual={annual} monthly={monthly} selectedYear={selectedYear} />
        )}
      </div>
    </div>
  );
}
