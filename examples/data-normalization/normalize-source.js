'use strict';

// A synthetic, platform-neutral example of converting different source fields
// into one canonical result shape. Raw response bodies are intentionally not kept.

const ADAPTERS = Object.freeze({
  adsConsole: Object.freeze({
    source: 'ads-console-demo',
    sourceProfile: 'ads-summary-demo',
    fields: Object.freeze({
      spend: Object.freeze({ path: 'spendYuan', valueType: 'number', unit: 'yuan' }),
      orders: Object.freeze({ path: 'paidOrders', valueType: 'integer', unit: 'count' })
    })
  }),
  liveDashboard: Object.freeze({
    source: 'live-dashboard-demo',
    sourceProfile: 'live-overview-demo',
    fields: Object.freeze({
      gmv: Object.freeze({ path: 'paidAmountFen', valueType: 'number', unit: 'yuan', divisor: 100 }),
      viewers: Object.freeze({ path: 'viewerCount', valueType: 'integer', unit: 'count' })
    })
  })
});

function isValidValue(valueType, value) {
  if (valueType === 'integer') return Number.isSafeInteger(value);
  if (valueType === 'number') return typeof value === 'number' && Number.isFinite(value);
  return false;
}

function normalizeField(raw, specification) {
  if (!Object.prototype.hasOwnProperty.call(raw, specification.path)) {
    return { status: 'missing', value: null, error: { code: 'FIELD_MISSING' } };
  }

  const sourceValue = raw[specification.path];
  if (typeof sourceValue !== 'number' || !Number.isFinite(sourceValue)) {
    return { status: 'invalid', value: null, error: { code: 'INVALID_NUMBER' } };
  }

  const value = sourceValue / (specification.divisor || 1);
  if (!isValidValue(specification.valueType, value) || value < 0) {
    return { status: 'invalid', value: null, error: { code: 'VALUE_OUT_OF_RANGE' } };
  }

  return { status: 'ok', value, error: null };
}

function normalizeCapture(adapter, raw, context = {}) {
  if (!adapter || !adapter.fields || !raw || typeof raw !== 'object') {
    throw new TypeError('adapter and raw source object are required');
  }

  const values = {};
  const diagnostics = [];
  for (const [canonicalName, specification] of Object.entries(adapter.fields)) {
    const normalized = normalizeField(raw, specification);
    values[canonicalName] = {
      ...normalized,
      unit: specification.unit
    };
    if (normalized.status !== 'ok') {
      diagnostics.push({ field: canonicalName, code: normalized.error.code });
    }
  }

  return {
    source: adapter.source,
    sourceProfile: adapter.sourceProfile,
    captureContext: {
      captureId: context.captureId || null,
      sessionKey: context.sessionKey || null,
      capturedAt: context.capturedAt || new Date().toISOString()
    },
    sourceStatus: diagnostics.length === 0 ? 'verified' : 'partial',
    values,
    diagnostics,
    // Keep only field names as compact evidence; never retain the raw payload.
    evidence: {
      observedFields: Object.keys(raw).filter(key =>
        Object.values(adapter.fields).some(specification => specification.path === key)
      )
    }
  };
}

if (require.main === module) {
  const adsResult = normalizeCapture(ADAPTERS.adsConsole, {
    spendYuan: 128.5,
    paidOrders: 12
  }, {
    captureId: 'capture-demo-ads-001',
    sessionKey: 'session-demo-001',
    capturedAt: '2026-11-06T10:00:00+08:00'
  });

  const liveResult = normalizeCapture(ADAPTERS.liveDashboard, {
    paidAmountFen: 25680,
    viewerCount: 'not-a$D