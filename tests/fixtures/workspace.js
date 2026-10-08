import { dateOffset } from '../../src/lib/dates.js';
export const FIXTURE_USER = { id: 'test-intern', email: 'intern@example.com' };
const KEY = 'test-workspace-data';
const owned = (rows) =>
  rows.map((row) => ({
    user_id: FIXTURE_USER.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...row,
  }));
function seed() {
  return {
    profiles: [
      {
        id: FIXTURE_USER.id,
        email: FIXTURE_USER.email,
        full_name: 'Alex Reyes',
        school: 'Your university',
        program: 'BS Medical Technology',
        year_level: '4th Year',
        internship_start_date: dateOffset(-42),
      },
    ],
    rotations: owned([
      {
        id: 'r1',
        section_name: 'Hematology',
        hospital_site: 'Training hospital · Main laboratory',
        supervisor_name: 'Your clinical instructor',
        start_date: dateOffset(-9),
        end_date: dateOffset(12),
        notes: 'A little more confident, one day at a time.',
      },
      {
        id: 'r2',
        section_name: 'Clinical Chemistry',
        hospital_site: 'Training hospital',
        start_date: dateOffset(13),
        end_date: dateOffset(34),
      },
      {
        id: 'r3',
        section_name: 'Microbiology',
        start_date: dateOffset(-42),
        end_date: dateOffset(-10),
        hospital_site: 'Training hospital',
      },
    ]),
    shifts: owned(
      [0, 1, 3, 5].map((offset, i) => ({
        id: 's' + i,
        section_name: 'Hematology',
        shift_date: dateOffset(offset),
        start_time: i === 2 ? '22:00:00' : '07:00:00',
        end_time: i === 2 ? '06:00:00' : '15:00:00',
        shift_type: i === 2 ? 'night' : 'morning',
        notes: i === 0 ? 'Bring your logbook and a little courage.' : '',
      })),
    ),
    exams: owned([
      {
        id: 'e1',
        exam_name: 'Hematology practical',
        section_name: 'Hematology',
        exam_date: dateOffset(6),
        notes: 'Review your rotation notes.',
      },
    ]),
    quotas: owned([
      {
        id: 'q1',
        section_name: 'Hematology',
        task_name: 'Complete blood count',
        target_count: 50,
        completed_count: 32,
      },
      {
        id: 'q2',
        section_name: 'Hematology',
        task_name: 'Peripheral blood smear',
        target_count: 30,
        completed_count: 18,
      },
      {
        id: 'q3',
        section_name: 'Microbiology',
        task_name: 'Gram staining',
        target_count: 30,
        completed_count: 30,
      },
    ]),
    daily_reports: owned([
      {
        id: 'l1',
        section_name: 'Hematology',
        procedure_name: 'Complete blood count',
        count_done: 4,
        log_date: dateOffset(0),
        competency: 'pass',
        supervisor: 'Clinical instructor',
        notes: 'Feeling more comfortable with the workflow.',
        progress: 100,
      },
      {
        id: 'l2',
        section_name: 'Hematology',
        procedure_name: 'Peripheral blood smear',
        count_done: 3,
        log_date: dateOffset(-1),
        competency: 'observed',
        notes: 'Wrote down questions to ask tomorrow.',
        progress: 100,
      },
    ]),
    notes: owned([
      {
        id: 'n1',
        section_name: 'Hematology',
        title: 'Little things to remember on duty',
        body: 'Pack your logbook, pen, water, and a snack.\nAsk your supervisor when you are unsure.\nYou do not need to know everything on your first day.',
        is_staff_tip: false,
      },
      {
        id: 'n2',
        section_name: 'Microbiology',
        title: 'A tip from my senior',
        body: 'Keep a small list of questions during your shift. At the end of duty, take a moment to review what you learned.',
        is_staff_tip: true,
      },
    ]),
    documents: [],
    user_settings: [],
    chat_messages: [],
    procedures: [],
    mood_logs: [],
    quota_tasks: [],
  };
}
function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.profiles)) return saved;
  } catch {
    /* recover invalid test records */
  }
  const data = seed();
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}
function persist(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
class FixtureQuery {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this.orders = [];
    this.action = 'select';
    this.returnRows = false;
  }
  select() {
    this.returnRows = true;
    return this;
  }
  eq(key, value) {
    this.filters.push((row) => row[key] === value);
    return this;
  }
  neq(key, value) {
    this.filters.push((row) => row[key] !== value);
    return this;
  }
  gte(key, value) {
    this.filters.push((row) => row[key] >= value);
    return this;
  }
  lte(key, value) {
    this.filters.push((row) => row[key] <= value);
    return this;
  }
  gt(key, value) {
    this.filters.push((row) => row[key] > value);
    return this;
  }
  lt(key, value) {
    this.filters.push((row) => row[key] < value);
    return this;
  }
  in(key, values) {
    this.filters.push((row) => values.includes(row[key]));
    return this;
  }
  ilike(key, value) {
    const term = value.replaceAll('%', '').toLowerCase();
    this.filters.push((row) =>
      String(row[key] || '')
        .toLowerCase()
        .includes(term),
    );
    return this;
  }
  or(expression) {
    const parts = expression.split(',').map((part) => part.split('.ilike.'));
    this.filters.push((row) =>
      parts.some(([key, value = '']) =>
        String(row[key] || '')
          .toLowerCase()
          .includes(value.replaceAll('%', '').toLowerCase()),
      ),
    );
    return this;
  }
  order(key, options = {}) {
    this.orders.push({ key, ascending: options.ascending !== false });
    return this;
  }
  limit(count) {
    this.count = count;
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  maybeSingle() {
    this.one = true;
    return this;
  }
  insert(values) {
    this.action = 'insert';
    this.values = values;
    this.returnRows = false;
    return this;
  }
  upsert(values, options = {}) {
    this.action = 'upsert';
    this.values = values;
    this.conflict = options.onConflict;
    this.returnRows = false;
    return this;
  }
  update(values) {
    this.action = 'update';
    this.values = values;
    this.returnRows = false;
    return this;
  }
  delete() {
    this.action = 'delete';
    this.returnRows = false;
    return this;
  }
  async execute() {
    try {
      const data = read();
      const table = (data[this.table] ||= []);
      const matches = (row) => this.filters.every((filter) => filter(row));
      let rows = [];
      if (this.action === 'select') rows = table.filter(matches);
      if (this.action === 'insert' || this.action === 'upsert') {
        const values = Array.isArray(this.values) ? this.values : [this.values];
        rows = values.map((value) => {
          const keys = (this.conflict || 'id').split(',').map((key) => key.trim());
          const existing =
            this.action === 'upsert'
              ? table.find((row) =>
                  keys.every((key) => value[key] !== undefined && row[key] === value[key]),
                )
              : null;
          if (existing) {
            Object.assign(existing, value, { updated_at: new Date().toISOString() });
            return existing;
          }
          const row = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...value,
          };
          table.push(row);
          return row;
        });
        persist(data);
      }
      if (this.action === 'update') {
        rows = table.filter(matches);
        rows.forEach((row) =>
          Object.assign(row, this.values, { updated_at: new Date().toISOString() }),
        );
        persist(data);
      }
      if (this.action === 'delete') {
        rows = table.filter(matches);
        data[this.table] = table.filter((row) => !matches(row));
        persist(data);
      }
      if (this.orders.length)
        rows.sort((a, b) => {
          for (const order of this.orders) {
            const x = a[order.key],
              y = b[order.key];
            const cmp = x < y ? -1 : x > y ? 1 : 0;
            if (cmp) return order.ascending ? cmp : -cmp;
          }
          return 0;
        });
      if (this.count !== undefined) rows = rows.slice(0, this.count);
      return {
        data: this.returnRows ? (this.one ? rows[0] || null : structuredClone(rows)) : null,
        error: null,
        count: rows.length,
      };
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}
export const fixtureClient = {
  from: (table) => new FixtureQuery(table),
  auth: {
    getSession: async () => ({
      data: { session: { user: FIXTURE_USER, access_token: 'fixture-access-token' } },
      error: null,
    }),
    getUser: async () => ({ data: { user: FIXTURE_USER }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => {
      return { error: null };
    },
    updateUser: async () => ({
      error: {
        message: 'Password changes are disabled in tests.',
      },
    }),
    signInWithPassword: async () => ({
      error: { message: 'Sign-in is disabled in tests.' },
    }),
    signUp: async () => ({ error: { message: 'Signup is disabled in tests.' } }),
  },
  storage: {
    from: () => ({
      upload: async () => ({
        error: {
          message: 'File uploads are disabled in tests.',
        },
      }),
      remove: async () => ({ error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
};
