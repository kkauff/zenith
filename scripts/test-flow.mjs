// Quick smoke test of the storage layer — simulates the create-program +
// load-programs round-trip without needing a browser.
class FakeStorage {
  constructor() { this.s = {}; }
  getItem(k) { return this.s[k] ?? null; }
  setItem(k, v) { this.s[k] = String(v); }
  removeItem(k) { delete this.s[k]; }
}
globalThis.localStorage = new FakeStorage();
let counter = 0;
// crypto is read-only on Node's globalThis, so override just the property we use.
Object.defineProperty(globalThis.crypto, 'randomUUID', {
  value: () => `uuid-${++counter}`,
  configurable: true,
});

const store = await import('../src/storage.ts');

// Simulate the create flow.
const fields = {
  name: '5x5',
  categoryKey: 'weightlifting',
  exercises: [
    {
      id: 'ex-1',
      name: 'Squat',
      schedule: { days: [1, 3, 5] },
      plannedSets: [
        { weight: 135, reps: { min: 5, max: 5 } },
        { weight: 185, reps: { min: 5, max: 5 } },
      ],
      goalWeight: 225,
    },
  ],
};

const created = store.createProgram('user-abc', fields);
console.log('created.id =', created.id);

const loaded = store.loadPrograms('user-abc');
console.log('loaded.length =', loaded.length);
console.log('loaded[0].id =', loaded[0]?.id);
console.log('matches?', loaded[0]?.id === created.id);
console.log('exercises kept?', loaded[0]?.exercises.length);
console.log('plannedSets kept?', loaded[0]?.exercises[0]?.plannedSets?.length);
