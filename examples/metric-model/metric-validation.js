'use strict';

// A small, dependency-free example distilled from Xiaoman's metric model.
// It demonstrates explicit metric definitions, typed values and immutable results.

const ALLOWED_TYPES = new Set(['number', 'integer', 'ratio', 'text']);
const ALLOWED_FORMATTERS = new Set(['money_2', 'integer', 'percent_2', 'plain']);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function validateMetricDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('metric definition is required');
  }
  for (const field of ['id', 'name', 'source', 'unit', 'definitionId']) {
    if (typeof definition[field] !== 'string' || !definition[field].trim()) {
      throw new TypeError(`${field} is required`);
    }
  }
  if (!ALLOWED_TYPES.has(definition.valueType)) {
    throw new TypeError(`unsupported valueType: ${definition.valueType}`);
  }
  if (!ALLOWED_FORMATTERS.has(definition.formatter)) {
    throw new TypeError(`unsupported formatter: ${definition.formatter}`);
  }
  if (!Number.isInteger(definition.definitionVersion) || definition.definitionVersion < 1) {
    throw new TypeError('definitionVersion must be a positive integer');
  }
  return deepFreeze({ ...definition });
}

function isValidValue(valueType, value) {
  if (valueType === 'integer') return Number.isSafeInteger(value);
  if (valueType === 'number' || valueType === 'ratio') {
    return typeof value === 'number' && Number.isFinite(value);
  }
  if (valueType === 'text') return typeof value === 'string';
  return false;
}

function formatDisplay(definition, value) {
  switch (definition.formatter) {
    case 'money_2':
      return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'integer':
      return value.toLocaleString('zh-CN');
    case 'percent_2':
      return `${(value * 100).toFixed(2)}%`;
    case 'plain':
      return String(value);
    default:
      throw new TypeError(`unsupported formatter: ${definition.formatter}`);
  }
}

function createMetricResult({ definition, value, status = 'ok', capturedAt, snapshotId = null }) {
  const metric = validateMetricDefinition(definition);
  if (!['ok', 'missing', 'invalid'].includes(status)) {
    throw new TypeError(`unsupported result status: ${status}`);
  }

  const ok = status === 'ok';
  if (ok && !isValidValue(metric.valueType, value)) {
    throw new TypeError(`value does not match ${metric.valueType}`);
  }
  if (!ok && value !== null) {
    throw new TypeError('non-ok result must not carry a value');
  }

  return deepFreeze({
    metricId: metric.id,
    metricName: metric.name,
    definitionId: metric.definitionId,
    definitionVersion: metric.definitionVersion,
    source: metric.source,
    unit: metric.unit,
    status,
    rawValue: ok ? value : null,
    displayValue: ok ? formatDisplay(metric, value) : null,
    copyValue: ok ? String(value) : null,
    error: ok ? null : {
      code: status === 'missing' ? 'FIELD_MISSING' : 'INVALID_VALUE',
      message: status === 'missing' ? 'source field is missing' : 'source value failed validation'
    },
    capturedAt: capturedAt || new Date().toISOString(),
    snapshotId
  });
}

const metricDefinitions = Object.freeze({
  spend: validateMetricDefinition({
    id: 'ads.spend', name: '广告消耗', source: 'ads-console-demo',
    valueType: 'number', unit: 'yuan', formatter: 'money_2',
    definitionId: 'demo.ads.spend', definitionVersion: 1
  }),
  conversionRate: validateMetricDefinition({
    id: 'live.conversion_rate', name: '成交转化率', source: 'live-dashboard-demo',
    valueType: 'ratio', unit: 'ratio', formatter: 'percent_2',
    definitionId: 'demo.live.conversion_rate', definitionVersion: 1
  })
});

if (require.main === module) {
  const spend = createMetricResult({
    definition: metricDefinitions.spend,
    value: 128.5,
    capturedAt: '2026-11-06T10:00:00+08:00',
    snapshotId: 'snapshot-demo-001'
  });
  const missingRate = createMetricResult({
    definition: metricDefinitions.conversionRate,
    value: null,
    status: 'missing',
    capturedAt: '2026-11-06T10:00:00+08:00',
    snapshotId: 'snapshot-demo-001'
  });
  console.log(JSON.stringify({ spend, missingRate }, null, 2));
}

module.exports = { validateMetricDefinition, createMetricResult, isValidValue };
