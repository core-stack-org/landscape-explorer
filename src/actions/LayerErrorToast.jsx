import React from 'react';
import { LAYER_ERROR_TYPES, RESOLUTION_HINTS } from './layerErrorBus';

// ─── Type → display metadata ─────────────────────────────────────────────────

const TYPE_META = {
  [LAYER_ERROR_TYPES.FETCH_FAILED]:    { label: 'Fetch failed',    color: '#C0392B', bg: '#FDEDEC' },
  [LAYER_ERROR_TYPES.NETWORK_ERROR]:   { label: 'Network error',   color: '#C0392B', bg: '#FDEDEC' },
  [LAYER_ERROR_TYPES.PARSE_ERROR]:     { label: 'Parse error',     color: '#D35400', bg: '#FEF5EC' },
  [LAYER_ERROR_TYPES.IMAGE_LOAD_ERROR]:{ label: 'Tile error',      color: '#7D3C98', bg: '#F5EEF8' },
  [LAYER_ERROR_TYPES.API_ERROR]:       { label: 'API error',       color: '#1A5276', bg: '#EAF2FF' },
  [LAYER_ERROR_TYPES.CONFIG_ERROR]:    { label: 'Config error',    color: '#1E8449', bg: '#EAFAF1' },
};

function resolveHint(error) {
  const hintFn = RESOLUTION_HINTS[error.type];
  if (!hintFn) return `An unexpected error occurred loading "${error.layerName}".`;

  switch (error.type) {
    case LAYER_ERROR_TYPES.FETCH_FAILED:
    case LAYER_ERROR_TYPES.IMAGE_LOAD_ERROR:
      return hintFn(error.layerName, error.httpStatus);
    case LAYER_ERROR_TYPES.API_ERROR:
      return hintFn(error.layerName, error.httpStatus);
    case LAYER_ERROR_TYPES.CONFIG_ERROR:
      return hintFn(error.layerName);
    default:
      return hintFn(error.layerName);
  }
}

// ─── Styles (plain objects — no CSS-in-JS dependency) ────────────────────────

const styles = {
  container: {
    position: 'absolute',
    bottom: '24px',
    right: '16px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxWidth: '360px',
    width: '100%',
    pointerEvents: 'none', // let clicks pass through to the map
  },
  toast: {
    background: '#FFFFFF',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    padding: '12px 14px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
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
    padding: '3px 10px',
    borderRadius: '4px',
    border: '1px solid #1A73E8',
    background: 'transparent',
    color: '#1A73E8',
    fontSize: '12px',
    fontWeight: '500',
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
    color: '#888',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0 2px',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function LayerErrorToast({ errors = [], onDismiss, onRetry }) {
  if (!errors.length) return null;

  return (
    <div style={styles.container} role="region" aria-label="Map layer errors" aria-live="polite">
      {errors.map((error) => {
        const meta = TYPE_META[error.type] || TYPE_META[LAYER_ERROR_TYPES.FETCH_FAILED];
        const hint = resolveHint(error);

        return (
          <div key={error.id} style={styles.toast} role="alert">
            <div style={styles.header}>
              <div style={styles.badgeRow}>
                <span style={styles.badge(meta)}>{meta.label}</span>
                <span style={styles.layerName} title={error.layerName}>
                  {error.layerName}
                </span>
              </div>
              <button
                style={styles.dismissBtn}
                onClick={() => onDismiss(error.id)}
                aria-label={`Dismiss error for ${error.layerName}`}
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
  );
}