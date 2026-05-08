// Smoke test for adherence math. Builds a program created last week, with one
// exercise scheduled M/W/F, and varying log history to verify percentages.
const today = new Date(); // run-time "today"
const dow = today.getDay();
console.log('today is dow=', dow, today.toDateString());

const t = await import('../src/today.ts');

function daysAgo(n) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d;
}

const programCreated = daysAgo(14).getTime();
const program = {
  id: 'p1',
  name: '5x5',
  categoryKey: 'weightlifting',
  createdAt: programCreated,
  exercises: [
    {
      id: 'ex1',
      name: 'Squat',
      schedule: { days: [1, 3, 5] }, // Mon, Wed, Fri
      trackingType: 'weight',
      plannedSets: [],
    },
  ],
};

// Log on every Mon/Wed/Fri in the last 14 days.
const instances = [];
for (let n = 14; n >= 0; n--) {
  const d = daysAgo(n);
  if ([1, 3, 5].includes(d.getDay())) {
    instances.push({
      id: `i-${n}`,
      programId: 'p1',
      exerciseId: 'ex1',
      loggedAt: d.getTime(),
      sets: [{ weight: 185, reps: 5 }],
    });
  }
}

console.log('logged on', instances.length, 'days');

// Adherence tests
console.log('today:', t.adherenceToday([program], instances, today));
console.log('week:', t.adherenceWeek([program], instances, today));
console.log('month:', t.adherenceMonth([program], instances, today));

// Drop the last instance and re-check
const partial = instances.slice(0, -1);
console.log('--- after dropping last logged session ---');
console.log('today:', t.adherenceToday([program], partial, today));
console.log('week:', t.adherenceWeek([program], partial, today));

// What happens if today is not a scheduled day?
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const dowTomorrow = tomorrow.getDay();
console.log('--- pretend today is dow=', dowTomorrow, ' (no schedule if not 1/3/5) ---');
console.log('today:', t.adherenceToday([program], instances, tomorrow));
