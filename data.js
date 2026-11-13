/* Sample data generator for the demo. Everything here is fictional.
   Data is generated in the browser from a fixed seed, relative to today's date,
   so the demo always looks current and no real records are stored anywhere. */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20261113);
  const int = (n) => Math.floor(rnd() * n);
  const pick = (a) => a[int(a.length)];
  const digits = (n) => Array.from({ length: n }, () => int(10)).join('');
  const DAY = 86400000;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const T = today.getTime();

  const EMPLOYEE_COUNT = 10480;

  const sites = [
    'Dubai – Head Office', 'Dubai – Jebel Ali', 'Dubai – Al Quoz', 'Dubai – DIP',
    'Abu Dhabi – Mussafah', 'Abu Dhabi – ICAD', 'Abu Dhabi – KIZAD', 'Al Ain',
    'Sharjah – Industrial Area', 'Ajman', 'Ras Al Khaimah', 'Fujairah',
  ];
  const siteWeights = [3, 16, 12, 9, 14, 8, 7, 5, 11, 6, 5, 4];

  const jobs = ['Security guard', 'Cleaner', 'Driver', 'Technician', 'Helper', 'Electrician',
    'Plumber', 'Site supervisor', 'Machine operator', 'Storekeeper', 'Administrator', 'HR officer', 'Accountant'];
  const jobWeights = [18, 18, 9, 10, 14, 6, 5, 5, 6, 3, 3, 1, 2];

  const people = [
    { nat: 'India', w: 30,
      first: ['Arun', 'Suresh', 'Rajesh', 'Vijay', 'Anil', 'Manoj', 'Deepak', 'Sanjay', 'Ravi', 'Kiran', 'Priya', 'Anita', 'Mohan', 'Ganesh'],
      last: ['Kumar', 'Nair', 'Pillai', 'Sharma', 'Singh', 'Reddy', 'Menon', 'Patel', 'Das', 'Yadav', 'Thomas', 'Varghese'] },
    { nat: 'Pakistan', w: 16,
      first: ['Imran', 'Bilal', 'Usman', 'Asif', 'Faisal', 'Kamran', 'Naveed', 'Tariq', 'Shahid', 'Zubair', 'Adnan'],
      last: ['Khan', 'Ahmed', 'Hussain', 'Malik', 'Iqbal', 'Butt', 'Qureshi', 'Raza', 'Shah', 'Aslam'] },
    { nat: 'Bangladesh', w: 14,
      first: ['Rahim', 'Karim', 'Jamal', 'Shafiq', 'Monir', 'Rubel', 'Sohel', 'Habib', 'Nasir', 'Mizan'],
      last: ['Uddin', 'Hossain', 'Islam', 'Miah', 'Rahman', 'Alam', 'Sarkar', 'Mollah', 'Chowdhury'] },
    { nat: 'Nepal', w: 12,
      first: ['Bishal', 'Suman', 'Prakash', 'Dipak', 'Ramesh', 'Santosh', 'Binod', 'Krishna', 'Hari', 'Nabin'],
      last: ['Thapa', 'Gurung', 'Tamang', 'Shrestha', 'Rai', 'Magar', 'Adhikari', 'Karki', 'Bhandari'] },
    { nat: 'Philippines', w: 11,
      first: ['Jose', 'Maria', 'Mark', 'Jerome', 'Grace', 'Rowena', 'Ramon', 'Liza', 'Arnel', 'Joy', 'Dennis'],
      last: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Ramos', 'Aquino', 'Flores', 'Navarro'] },
    { nat: 'Sri Lanka', w: 5,
      first: ['Nuwan', 'Chaminda', 'Sampath', 'Ruwan', 'Dinesh', 'Kasun', 'Nimal', 'Sunil'],
      last: ['Perera', 'Fernando', 'Silva', 'Jayasinghe', 'Bandara', 'Dissanayake', 'Gunawardena'] },
    { nat: 'Egypt', w: 5,
      first: ['Ahmed', 'Mahmoud', 'Mostafa', 'Khaled', 'Tamer', 'Hany', 'Sherif', 'Wael'],
      last: ['Hassan', 'Ibrahim', 'Mahmoud', 'Sayed', 'Farouk', 'Mansour', 'Saleh', 'Fathy'] },
    { nat: 'Kenya', w: 4,
      first: ['Brian', 'Kevin', 'Dennis', 'Faith', 'Mercy', 'Collins', 'Peter', 'Joseph'],
      last: ['Otieno', 'Mwangi', 'Kamau', 'Ochieng', 'Wanjiru', 'Kiprop', 'Njoroge', 'Mutua'] },
    { nat: 'Uganda', w: 3,
      first: ['Ivan', 'Moses', 'Ronald', 'Sarah', 'Isaac', 'Derrick', 'Brenda', 'Julius'],
      last: ['Mukasa', 'Okello', 'Ssemanda', 'Namutebi', 'Kato', 'Opio', 'Nsubuga', 'Tumusiime'] },
  ];

  function weighted(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r < 0) return i; }
    return items.length - 1;
  }
  const peopleWeights = people.map((p) => p.w);

  /* ---------- Employees ---------- */
  const employees = [];
  for (let i = 0; i < EMPLOYEE_COUNT; i++) {
    const g = people[weighted(people, peopleWeights)];
    const name = pick(g.first) + ' ' + pick(g.last);
    const id = 'E' + String(i + 1).padStart(5, '0');
    employees.push({
      idx: i, id, name, nat: g.nat,
      site: weighted(sites, siteWeights),
      job: jobs[weighted(jobs, jobWeights)],
      joined: T - (200 + int(3400)) * DAY,
      key: (id + ' ' + name).toLowerCase(),
    });
  }

  /* ---------- Staff documents ---------- */
  const docTypes = [
    { name: 'Passport', validity: 3650 },
    { name: 'Residence visa', validity: 730 },
    { name: 'Emirates ID', validity: 730 },
    { name: 'Labour card', validity: 730 },
    { name: 'Medical insurance', validity: 365 },
  ];
  function docNumber(t) {
    switch (t) {
      case 0: return String.fromCharCode(65 + int(26)) + digits(7);
      case 1: return '201/' + (2024 + int(3)) + '/' + digits(7);
      case 2: return '784-' + (1965 + int(40)) + '-' + digits(7) + '-' + digits(1);
      case 3: return digits(8);
      default: return 'MI-' + digits(9);
    }
  }
  function offset(validity) {
    if (rnd() < 0.009) return -1 - int(75);          // a small share already expired
    return int(validity);
  }
  const docs = [];
  let docId = 0;
  for (const e of employees) {
    let visaOffset = 0;
    for (let t = 0; t < docTypes.length; t++) {
      let off = offset(docTypes[t].validity);
      if (t === 1) visaOffset = off;
      if (t === 2 && rnd() < 0.9) off = visaOffset;   // Emirates ID usually follows the visa
      const missing = t === 4 && rnd() < 0.006;      // a few insurance cards never uploaded
      docs.push({
        id: docId++, emp: e.idx, type: t,
        no: missing ? null : docNumber(t),
        exp: missing ? null : T + off * DAY,
      });
    }
  }

  /* ---------- Contracts and company documents ---------- */
  const conTypes = ['Client contract', 'Supplier agreement', 'Tenancy', 'Insurance policy', 'Trade licence'];
  const conWeights = [46, 26, 12, 10, 6];
  const nameA = ['Falcon Ridge', 'Blue Dune', 'Palm Harbour', 'Silver Creek', 'Desert Pearl', 'Northgate', 'Red Mangrove',
    'Sandstone', 'Gulf Lantern', 'Oryx Field', 'Coral Bay', 'Saffron Gate', 'Marina Crest', 'Cedar Point', 'Amber Coast'];
  const nameB = ['Logistics', 'Facilities', 'Contracting', 'Hospitality', 'Retail', 'Engineering', 'Properties',
    'Trading', 'Marine Services', 'Industries', 'Catering', 'Developments'];
  const owners = ['Commercial team', 'Procurement', 'Facilities', 'Finance', 'PRO office'];
  const contracts = [];
  for (let i = 0; i < 320; i++) {
    const type = weighted(conTypes, conWeights);
    const term = [365, 365, 730, 1095][int(4)];
    const off = rnd() < 0.03 ? -1 - int(45) : int(term);
    const renew = T + off * DAY;
    const value = type === 0 ? 400000 + int(240) * 100000
      : type === 1 ? 50000 + int(180) * 25000
      : type === 2 ? 80000 + int(90) * 20000
      : type === 3 ? 30000 + int(60) * 15000
      : 12000 + int(20) * 2000;
    contracts.push({
      id: i,
      ref: 'CT-' + (2023 + int(4)) + '-' + String(i + 1).padStart(4, '0'),
      party: type === 4 ? 'Licensing authority – ' + pick(['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'])
        : pick(nameA) + ' ' + pick(nameB),
      type, owner: type === 0 ? 'Commercial team' : type === 1 ? 'Procurement' : type === 2 ? 'Facilities' : type === 3 ? 'Finance' : 'PRO office',
      site: weighted(sites, siteWeights),
      value, start: renew - term * DAY, exp: renew,
      notice: [30, 60, 90][int(3)], autoRenew: rnd() < 0.35,
      key: '',
    });
  }
  contracts.forEach((c) => { c.key = (c.ref + ' ' + c.party).toLowerCase(); });

  /* ---------- Audit trail (seeded history) ---------- */
  const users = ['HR officer – Dubai', 'HR officer – Abu Dhabi', 'Visa team', 'Contracts team', 'Site manager – Jebel Ali', 'System'];
  const audit = [];
  for (let i = 0; i < 36; i++) {
    const kind = int(5);
    const d = docs[int(docs.length)];
    const e = employees[d.emp];
    const c = contracts[int(contracts.length)];
    const when = Date.now() - (i * 47 + int(40)) * 60000;
    if (kind === 0) audit.push({ t: when, user: pick(users.slice(0, 3)), action: 'Uploaded renewal', target: docTypes[d.type].name + ' · ' + e.name + ' (' + e.id + ')' });
    else if (kind === 1) audit.push({ t: when, user: pick(users.slice(0, 3)), action: 'Viewed document', target: docTypes[d.type].name + ' · ' + e.name + ' (' + e.id + ')' });
    else if (kind === 2) audit.push({ t: when, user: 'System', action: 'Sent reminder', target: docTypes[d.type].name + ' · ' + e.name + ' (' + e.id + ')' });
    else if (kind === 3) audit.push({ t: when, user: 'Contracts team', action: 'Viewed contract', target: c.ref + ' · ' + c.party });
    else audit.push({ t: when, user: 'System', action: 'Sent renewal notice', target: c.ref + ' · ' + c.party });
  }

  window.DB = { today: T, DAY, sites, employees, docTypes, docs, conTypes, owners, contracts, audit };
})();
