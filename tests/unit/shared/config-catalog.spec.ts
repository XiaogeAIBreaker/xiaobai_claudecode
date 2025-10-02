import { sharedConfigurationCatalog, listSharedConfigEntries, getSharedConfigEntry, setSharedConfigValidatedAt, updateSharedConfigValue } from '../../../src/shared/config/catalog';

const ISO_REGEX = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;

describe('shared/config/catalog', () => {
  it('exposes catalog entries with unique IDs', () => {
    const entries = listSharedConfigEntries();
    const ids = new Set(entries.map(entry => entry.id));

    expect(entries.length).toBeGreaterThan(0);
    expect(ids.size).toBe(entries.length);
  });

  it('returns existing entry via getSharedConfigEntry', () => {
    const entry = getSharedConfigEntry('installer.workflow.supportedFlows');

    expect(entry).toBeDefined();
    expect(entry?.value).toEqual(expect.arrayContaining(['onboarding', 'environment']));
  });

  it('updates lastValidatedAt via setSharedConfigValidatedAt', () => {
    const before = getSharedConfigEntry('installer.quickstart.lastValidatedAt');
    expect(before).toBeDefined();

    const nextTimestamp = '2099-01-01T00:00:00.000Z';
    const updated = setSharedConfigValidatedAt('installer.quickstart.lastValidatedAt', nextTimestamp);

    expect(updated?.lastValidatedAt).toBe(nextTimestamp);
    expect(updated?.value).toBe(nextTimestamp);
  });

  it('updates value and timestamp via updateSharedConfigValue', () => {
    const id = 'installer.cli.progressMessages';
    const nextValue = { ...getSharedConfigEntry<Record<string, string>>(id)?.value, extra: 'ok' };
    const updated = updateSharedConfigValue(id, nextValue);

    expect(updated?.value).toEqual(nextValue);
    expect(updated?.lastValidatedAt).toMatch(ISO_REGEX);
  });

  it('returns undefined when updating non-existent ID', () => {
    expect(updateSharedConfigValue('unknown.id', 'value')).toBeUndefined();
    expect(setSharedConfigValidatedAt('unknown.id', '2025-01-01T00:00:00.000Z')).toBeUndefined();
  });
});
