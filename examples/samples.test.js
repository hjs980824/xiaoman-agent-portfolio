'use strict';

const assert = require('node:assert/strict');
const { createMetricResult } = require('./metric-model/metric-validation');
const { ADAPTERS, normalizeCapture } = require('./data-normalization/normalize-source');

const spendDefinition = {
  id: 'ads.spend',
  name: '广告消耗',
  source: 'ads-console-demo',
  valueType: 'number',
  unit: 'yuan',
  formatter: 'money_2',
  definitionId: 'demo.ads.spend',
  definitionVersion: 1
};

const spend = createMetricResult({ definition: spendDefinition, value: 128.5 });
assert.equal(spend.rawValue, 128.5);
assert.equal(spend.copyValue, '128.5');
assert.throws(() => createMetricResult({
  definition: { ...spendDefinition, valueType: 'integer', formatter: 'integer' },
  value: 12.5
}), /does not match integer/);

const normalized = normalizeCapture(ADAPTERS.liveDashboard, {
  paidAmountFen: 25680,
  viewerCount: 'invalid'
}, { captureId: 'capture-test-001' });
assert.equal(normalized.values.gmv.value, 256.8);
assert.equal(normalized.values.viewers.status, 'invalid');
assert.equal(normalized.sourceStatus, 'partial');
assert.equal(Object.prototype.hasOwnProperty.call(normalized, 'raw'), false);

console.log('PASS: metric type validation, unit normalization and explicit partial status');
