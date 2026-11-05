'use strict';

const assert = require('node:assert/strict');
const { RunLedger } = require('./run-lifecycle');

const ledger = new RunLedger();
ledger.createRun({
  id: 'run-demo-001',
  expectedSources: ['ads-summary-demo', 'live-overview-demo']
});

const adsCheckpoint = {
  runId: 'run-demo-001',
  sourceProfile: 'ads-summary-demo',
  snapshotId: 'snapshot-ads-001',
  status: 'success',
  metrics: { spend: 128.5, orders: 12 }
};

const first = ledger.checkpointSource(adsCheckpoint);
const repeated = ledger.checkpointSource(adsCheckpoint);
assert.deepEqual(repeated, first, 'same checkpoint is idempotent');

assert.throws(() => ledger.checkpointSource({
  ...adsCheckpoint,
  metrics: { spend: 999, orders: 12 }
}), /CHECKPOINT_CONFLICT/, 'accepted checkpoint cannot be overwritten');

ledger.checkpointSource({
  runId: 'run-demo-001',
  sourceProfile: 'live-overview-demo',
  status: 'failed',
  error: { code: 'SOURCE_TIMEOUT', message: 'synthetic timeout' }
});

const finished = ledger.finishRun('run-demo-001');
assert.equal(finished.status, 'partial');
assert.deepEqual(finished.snapshotIds, ['snapshot-ads-001']);
assert.equal(finished.results.length, 2);
assert.equal(ledger.finishRun('run-demo-001').status, 'partial', 'terminal result is stable');

console.log('PASS: checkpoint idempotency, overwrite rejection and partial Run finalization');
