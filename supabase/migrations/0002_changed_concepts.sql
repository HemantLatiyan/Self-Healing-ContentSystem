-- Track which concepts the diff step flagged as altered, so the impact step
-- can narrow the patch set to only content tied to those concepts.
alter table change_sets
  add column changed_concepts text[];
