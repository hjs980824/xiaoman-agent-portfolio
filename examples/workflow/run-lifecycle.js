'use strict';

// A compact in-memory illustration of Run + source checkpoint semantics.
// Production Xiaoman uses IndexedDB transactions and capture-owner locks;
// this example focuses on the state model and is not a replacement for that store.

const TERMINAL_STATUSES = new Set(['success', 'partial', 'failed']);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

class RunLedger {
  constructor() {
    this.runs = new Map();
  }

  createRun({ id, expectedSources }) {
    if (!id || this.runs.has(id)) throw new Error('RUN_EXISTS_OR_INVALID');
    if (!Array.isArray(expectedSources) || expectedSources.length === 0) {
      throw new Error('EXPECTED_SOURCES_REQUIRED');
    }
    const uniqueSources = [...new Set(expectedSources)];
    if (uniqueSources.length !== expectedSources.length) throw new Error('DUPLICATE_SOURCE');

    const run = {
      id,
      status: 'running',
      expectedSources: uniqueSources,
      sourceResults: {},
      snapshotIds: [],
      startedAt: new Date().toISOString(),
      completedAt: null
    };
    this.runs.set(id, run);
    return this.getRun(id);
  }

  checkpointSource({ runId, sourceProfile, snapshotId, status, metrics = {}, error = null }) {
    const run = this.#requireRun(runId);
    if (run.status !== 'running') throw new Error('RUN_NOT_RUNNING');
    if (!run.expectedSources.includes(sourceProfile)) throw new Error('UNEXPECTED_SOURCE');
    if (!['success', 'failed'].includes(status)) throw new Error('INVALID_SOURCE_STATUS');

    const checkpoint = deepFreeze({
      sourceProfile,
      snapshotId: status === 'success' ? snapshotId : null,
      status,
      metrics: clone(metrics),
      error: error ? clone(error) : null,
      checkpointedAt: new Date().toISOString()
    });

    const previous = run.sourceResults[sourceProfile];
    if (previous) {
      // Repeating the same checkpoint is safe; changing an accepted checkpoint is not.
      const sameCheckpoint = previous.status === checkpoint.status
        && previous.snapshotId === checkpoint.snapshotId
        && JSON.stringify(previous.metrics) === JSON.stringify(checkpoint.metrics)
        && JSON.stringify(previous.error) === JSON.stringify(checkpoint.error);
      if (sameCheckpoint) return clone(previous);
      throw new Error('CHECKPOINT_CONFLICT');
    }

    run.sourceResults[sourceProfile] = checkpoint;
    if (checkpoint.snapshotId) run.snapshotIds.push(checkpoint.snapshotId);
    return clone(checkpoint);
  }

  finishRun(runId) {
    const run = this.#requireRun(runId);
    if (TERMINAL_STATUSES.has(run.status)) return this.getRun(runId);

    const completedSources = run.expectedSources.filter(source => run.sourceResults[source]);
    if (completedSources.length !== run.expectedSources.length) {
      throw new Error('SOURCES_NOT_TERMINAL');
    }

    const successCount = completedSources.filter(source =>
      run.sourceResults[source].status === 'success'
    ).length;

    run.status = successCount === run.expectedSources.length
      ? 'success'
      : successCount > 0 ? 'partial' : 'failed';
    run.completedAt = new Date().toISOString();
    run.results = run.expectedSources.map(source => clone(run.sourceResults[source]));
    return this.getRun(runId);
  }

  getRun(runId) {
    const run = this.#requireRun(runId);
    return deepFreeze(clone(run));
  }

  #requireRun(runId) {
    const run = this.runs.get(runId);
    if (!run) throw new Error('RUN_NOT_FOUND');
    return run;
  }
}

module.exports = { RunLedger };
