import { LAYER_ERROR_TYPES, RESOLUTION_HINTS, getFriendlyLayerName } from './layerErrorBus';

const TYPE_META = {
  [LAYER_ERROR_TYPES.FETCH_FAILED]:     { label: 'Not available',    color: '#B91C1C', bg: '#FEF2F2' },
  [LAYER_ERROR_TYPES.NETWORK_ERROR]:    { label: 'Connection issue', color: '#B91C1C', bg: '#FEF2F2' },
  [LAYER_ERROR_TYPES.PARSE_ERROR]:      { label: 'Not available',    color: '#B91C1C', bg: '#FEF2F2' },
  [LAYER_ERROR_TYPES.IMAGE_LOAD_ERROR]: { label: 'Not available',    color: '#B91C1C', bg: '#FEF2F2' },
  [LAYER_ERROR_TYPES.API_ERROR]:        { label: 'Data unavailable', color: '#B91C1C', bg: '#FEF2F2' },
  [LAYER_ERROR_TYPES.CONFIG_ERROR]:     { label: 'System issue',     color: '#B91C1C', bg: '#FEF2F2' },
};

function resolveHint(error) {
  const hintFn = RESOLUTION_HINTS[error.type];
  if (!hintFn) return `${getFriendlyLayerName(error.store)} isn't available right now.`;
  return hintFn();
}

const styles = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.15)',
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '380px',
    width: '90%',
    pointerEvents: 'none',
  },
  toast: {
    background: '#FFFFFF',
    border: '1px solid #FCA5A5',
    borderRadius: '10px',
    padding: '14px 16px',
    boxShadow: '0 8px 24px rgba(185,28,28,0.18), 0 2px 6px rgba(0,0,0,0.08)',
    pointerEvents: 'auto',
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#1A1A1A',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  badge: (meta) => ({
    display: 'inline-block',
    padding: '2px 7px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.02em',
    background: meta.bg,
    color: meta.color,
  }),
  layerName: {
    fontWeight: '600',
    fontSize: '13px',
    color: '#1A1A1A',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '180px',
  },
  hint: {
    color: '#5A5A5A',
    fontSize: '12px',
    margin: '4px 0 8px',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  retryBtn: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid #B91C1C',
    background: 'transparent',
    color: '#B91C1C',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  retryingBtn: {
    padding: '3px 10px',
    borderRadius: '4px',
    border: '1px solid #AAAAAA',
    background: 'transparent',
    color: '#AAAAAA',
    fontSize: '12px',
    cursor: 'not-allowed',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#9CA3AF',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0 2px',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LayerErrorToast({ errors = [], onDismiss, onRetry }) {
  if (!errors.length) return null;

  const handleBackdropClick = () => {
    const latest = errors[errors.length - 1];
    if (latest) onDismiss(latest.id);
  };

  return (
    <>
      <div style={styles.backdrop} onClick={handleBackdropClick} />
      <div style={styles.container} role="region" aria-label="Map layer errors" aria-live="polite">
        {errors.map((error) => {
        const meta = TYPE_META[error.type] || TYPE_META[LAYER_ERROR_TYPES.FETCH_FAILED];
        const hint = resolveHint(error);
        const friendlyName = getFriendlyLayerName(error.store);

        return (
          <div key={error.id} style={styles.toast} role="alert">
            <div style={styles.header}>
              <div style={styles.badgeRow}>
                <span style={styles.badge(meta)}>{meta.label}</span>
                <span style={styles.layerName} title={friendlyName}>
                  {friendlyName}
                </span>
              </div>
              <button
                style={styles.dismissBtn}
                onClick={() => onDismiss(error.id)}
                aria-label={`Dismiss error for ${friendlyName}`}
              >
                ×
              </button>
            </div>

            <p style={styles.hint}>{hint}</p>

            <div style={styles.footer}>
              {error.retryFn && (
                <button
                  style={error.retrying ? styles.retryingBtn : styles.retryBtn}
                  disabled={error.retrying}
                  onClick={() => onRetry(error.id)}
                >
                  {error.retrying ? 'Retrying…' : 'Retry'}
                </button>
              )}
              <button
                style={styles.dismissBtn}
                onClick={() => onDismiss(error.id)}
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
        })}
      </div>
    </>
  );
}