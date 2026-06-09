import { useState, useEffect, useCallback } from 'react';
import { layerErrorBus } from './layerErrorBus';

// Maximum simultaneous toasts — oldest are dropped if the queue is full
// to prevent the UI from being buried under errors during a GeoServer outage.
const MAX_VISIBLE_ERRORS = 5;

/**
 * @typedef {Object} ActiveError
 * @property {string}   id
 * @property {string}   type
 * @property {string}   layerName
 * @property {string}   [store]
 * @property {number}   [httpStatus]
 * @property {Function} [retryFn]
 * @property {number}   timestamp
 * @property {boolean}  retrying
 */

export function useLayerErrors() {
  const [errors, setErrors] = useState(/** @type {ActiveError[]} */ ([]));

  useEffect(() => {
    const unsubscribe = layerErrorBus.subscribe((payload) => {
      setErrors((prev) => {
        // De-duplicate: if the same layer is already showing an error,
        // replace it rather than stacking identical toasts.
        const withoutDuplicate = prev.filter(
          (e) => !(e.layerName === payload.layerName && e.type === payload.type)
        );

        const next = [...withoutDuplicate, payload];

        // Keep only the N most recent errors
        return next.slice(-MAX_VISIBLE_ERRORS);
      });
    });

    return unsubscribe;
  }, []);

  const dismiss = useCallback((id) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const retry = useCallback(async (id) => {
    const error = errors.find((e) => e.id === id);
    if (!error?.retryFn) return;

    // Mark as retrying so the UI can show a spinner
    setErrors((prev) =>
      prev.map((e) => (e.id === id ? { ...e, retrying: true } : e))
    );

    try {
      await error.retryFn();
      // On success, remove the toast
      dismiss(id);
    } catch {
      // On second failure, mark retrying: false so the button re-enables
      setErrors((prev) =>
        prev.map((e) => (e.id === id ? { ...e, retrying: false } : e))
      );
    }
  }, [errors, dismiss]);

  const dismissAll = useCallback(() => setErrors([]), []);

  return { errors, dismiss, retry, dismissAll };
}