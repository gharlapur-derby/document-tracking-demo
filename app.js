/* Document Control Centre – demo front end. Plain JavaScript, no build step. */
(function () {
  const DB = window.DB;
  const DAY = DB.DAY;
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => Number(n).toLocaleString('en-GB');
  const fmtDate = (ms) => ms == null ? '—' : new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtTime = (ms) => new Date(ms).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => 'AED ' + (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : fmt(n));

  /* ---------- Status ---------- */
  const STATUS = {
    expired: { label: 'Expired', icon: '✕' },
    d30: { label: 'Due in 30 days', icon: '!' },
    d90: { label: 'Due in 31–90 days', icon: '◷' },
    valid: { label: 'Valid', icon: '✓' },
    missing: { label: 'Missing', icon: '?' },
  };
  const daysOf = (exp) => exp == null ? null : Math.round((exp - DB.today) / DAY);
  const statusOf = (d) => d == null ? 'missing' : d < 0 ? 'expired' : d <= 30 ? 'd30' : d <= 90 ? 'd90' : 'valid';
  const pill = (st) => `<span class="pill st-${st}"><i aria-hidden="true">${STATUS[st].icon}</i>${STATUS[st].label}</span>`;
  const daysText = (d) => d == null ? '—' : d < 0 ? `${fmt(-d)} days ago` : d === 0 ? 'Today' : `${fmt(d)} days`;
  function stamp(item) { item.days = daysOf(item.exp); item.st = statusOf(item.days); }
  const urgency = (a, b) => (a.days == null ? -99999 : a.days) - (b.days == null ? -99999 : b.days);
  DB.docs.forEach(stamp); DB.contracts.forEach(stamp);
  DB.docs.sort(urgency); DB.contracts.sort(urgency);

  /* ---------- Roles ---------- */
  const ROLES = {
    hr: { label: 'HR and visa team', staff: 'full', contracts: 'none' },
    contracts: { label: 'Contracts team', staff: 'none', contracts: 'full' },
    manager: { label: 'Site manager – Jebel Ali', staff: 'status', contracts: 'view', site: 1 },
    exec: { label: 'Senior management', staff: 'status', contracts: 'view' },
  };
  const S = {
    view: 'dashboard', role: 'hr',
    staff: { q: '', site: '', type: '', status: '', month: '', page: 1 },
    con: { q: '', type: '', status: '', page: 1 },
  };
  const role = () => ROLES[S.role];
  const PAGE = 25;

  function scopedDocs() {
    const r = role();
    if (r.staff === 'none') return [];
    return r.site == null ? DB.docs : DB.docs.filter((d) => DB.employees[d.emp].site === r.site);
  }
  function scopedContracts() {
    const r = role();
    if (r.contracts === 'none') return [];
    return r.site == null ? DB.contracts : DB.contracts.filter((c) => c.site === r.site);
  }
  function log(action, target) { DB.audit.unshift({ t: Date.now(), user: role().label, action, target }); }

  /* ---------- Small UI helpers ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }
  const options = (items, sel, all) => `<option value="">${all}</option>` +
    items.map((x, i) => `<option value="${i}" ${String(sel) === String(i) ? 'selected' : ''}>${esc(x)}</option>`).join('');
  const statusOptions = (sel, keys) => '<option value="">All statuses</option>' +
    keys.map((k) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${STATUS[k].label}</option>`).join('');
  function pager(total, page, key) {
    const pages = Math.max(1, Math.ceil(total / PAGE));
    return `<div class="pager"><span>Page ${fmt(page)} of ${fmt(pages)}</span>
      <button class="btn small" data-act="page" data-key="${key}" data-to="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <button class="btn small" data-act="page" data-key="${key}" data-to="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next</button></div>`;
  }
  function locked(what, who) {
    return `<div class="card locked-panel"><h2>${what} are restricted for this role</h2>
      <p>You are viewing as <b>${esc(role().label)}</b>. ${who} Use “Viewing as” at the top to switch roles and see how access changes.</p></div>`;
  }
  function downloadCsv(name, header, rows) {
    const csv = [header].concat(rows).map((r) => r.map((c) => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  /* ---------- Dashboard ---------- */
  function countBy(list) {
    const c = { expired: 0, d30: 0, d90: 0, valid: 0, missing: 0 };
    for (const x of list) c[x.st]++;
    return c;
  }
  function monthChart(docs) {
    const start = new Date(DB.today); start.setDate(1);
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: d.toLocaleDateString('en-GB', { month: 'short' }), long: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), n: 0 });
    }
    const index = Object.fromEntries(months.map((m, i) => [m.key, i]));
    for (const d of docs) {
      if (d.exp == null || d.days < 0) continue;
      const dt = new Date(d.exp);
      const i = index[dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0')];
      if (i != null) months[i].n++;
    }
    const max = Math.max(1, ...months.map((m) => m.n));
    const step = Math.pow(10, Math.floor(Math.log10(max)));
    const top = Math.ceil(max / step) * step;
    const ticks = [0, top / 2, top];
    return `<div class="cols" role="img" aria-label="Bar chart of staff documents expiring in each of the next 12 months">
      <div class="yaxis">${ticks.map((t) => `<span style="bottom:${(t / top) * 100}%">${fmt(t)}</span>`).join('')}</div>
      <div class="plot">${ticks.slice(1).map((t) => `<div class="gridline" style="bottom:${(t / top) * 100}%"></div>`).join('')}
        <div class="bars">${months.map((m) => `<button class="col" data-act="month" data-month="${m.key}" data-tip="<b>${m.long}</b><br>${fmt(m.n)} documents expire" aria-label="${m.long}: ${fmt(m.n)} documents expire"><b style="height:${(m.n / top) * 100}%"></b></button>`).join('')}</div>
      </div>
      <div class="xaxis">${months.map((m) => `<span>${m.label}</span>`).join('')}</div>
    </div>`;
  }
  const ACTION = ['expired', 'd30', 'd90'];
  function stackRows(rows, filterKey, keys) {
    const max = Math.max(1, ...rows.map((r) => keys.reduce((a, k) => a + r.c[k], 0)));
    return `<div class="hbars">${rows.map((r) => {
      const total = keys.reduce((a, k) => a + r.c[k], 0);
      return `<div class="hrow"><span class="name" title="${esc(r.name)}">${esc(r.name)}</span>
        <div class="track" style="width:${Math.max(2, (total / max) * 100)}%">${keys.filter((k) => r.c[k] > 0).map((k) =>
          `<button class="seg c-${k}" style="flex:${r.c[k]}" data-act="drill" data-${filterKey}="${r.i}" data-status="${k}" data-tip="<b>${esc(r.name)}</b><br>${STATUS[k].label}: ${fmt(r.c[k])}" aria-label="${esc(r.name)}, ${STATUS[k].label}: ${fmt(r.c[k])}"></button>`).join('')}</div>
        <span class="total">${fmt(total)}</span></div>`;
    }).join('')}</div>`;
  }
  const legend = (keys) => `<div class="legend">${keys.map((k) => `<span><i class="dot c-${k}"></i>${STATUS[k].label}</span>`).join('')}</div>`;

  function viewDashboard() {
    const r = role();
    let html = '';
    if (r.staff !== 'none') {
      const docs = scopedDocs();
      const c = countBy(docs);
      const emps = r.site == null ? DB.employees.length : DB.employees.filter((e) => e.site === r.site).length;
      const ok = docs.length ? Math.round(((c.valid + c.d90 + c.d30) / docs.length) * 1000) / 10 : 0;
      const tile = (st, foot) => `<button class="tile" data-act="drill" data-status="${st}"><span class="tile-label">${pill(st)}</span><span class="tile-num">${fmt(c[st])}</span><span class="tile-foot">${foot}</span></button>`;
      const byType = DB.docTypes.map((t, i) => ({ name: t.name, i, c: { expired: 0, d30: 0, d90: 0 } }));
      const bySite = DB.sites.map((s, i) => ({ name: s, i, c: { expired: 0, d30: 0 } }));
      for (const d of docs) {
        if (d.st === 'expired' || d.st === 'd30' || d.st === 'd90') byType[d.type].c[d.st]++;
        if (d.st === 'expired' || d.st === 'd30') bySite[DB.employees[d.emp].site].c[d.st]++;
      }
      const sites = bySite.filter((s) => s.c.expired + s.c.d30 > 0).sort((a, b) => (b.c.expired + b.c.d30) - (a.c.expired + a.c.d30)).slice(0, 8);
      html += `<p class="section-title">Staff documents${r.site != null ? ' · ' + esc(DB.sites[r.site]) : ''}</p>
      <div class="tiles">
        <div class="tile"><span class="tile-label">Employees</span><span class="tile-num">${fmt(emps)}</span><span class="tile-foot">${fmt(docs.length)} documents tracked</span></div>
        ${tile('expired', 'Need action now')}${tile('d30', 'Renewal should be under way')}${tile('d90', 'Reminder window open')}${tile('missing', 'Never uploaded')}
        <div class="tile"><span class="tile-label">In date</span><span class="tile-num">${ok}%</span><span class="tile-foot">of all staff documents</span></div>
      </div>
      <div class="grid2">
        <div class="card"><div class="card-head"><div><h2>Documents expiring, next 12 months</h2><p class="sub">Staff documents by month of expiry. Select a bar to list them.</p></div></div>${monthChart(docs)}</div>
        <div class="card"><div class="card-head"><div><h2>Needs action, by document type</h2><p class="sub">Expired or due within 90 days</p></div></div>${legend(ACTION)}<div style="height:14px"></div>${stackRows(byType, 'type', ACTION)}</div>
      </div>`;
      if (r.site == null) html += `<div class="card"><div class="card-head"><div><h2>Sites with the most urgent documents</h2><p class="sub">Expired or due within 30 days. Select a segment to list them.</p></div>${legend(['expired', 'd30'])}</div>${stackRows(sites, 'site', ['expired', 'd30'])}</div>`;
    }
    if (r.contracts !== 'none') {
      const cons = scopedContracts();
      const c = countBy(cons);
      const value = cons.filter((x) => x.st !== 'expired').reduce((a, x) => a + x.value, 0);
      const next = cons.filter((x) => x.days != null && x.days >= 0).slice(0, 6);
      html += `<p class="section-title">Contracts and company documents${r.site != null ? ' · ' + esc(DB.sites[r.site]) : ''}</p>
      <div class="tiles">
        <div class="tile"><span class="tile-label">Active agreements</span><span class="tile-num">${fmt(cons.length - c.expired)}</span><span class="tile-foot">${money(value)} under contract</span></div>
        <button class="tile" data-act="cdrill" data-status="expired"><span class="tile-label">${pill('expired')}</span><span class="tile-num">${fmt(c.expired)}</span><span class="tile-foot">Lapsed, needs a decision</span></button>
        <button class="tile" data-act="cdrill" data-status="d30"><span class="tile-label">${pill('d30')}</span><span class="tile-num">${fmt(c.d30)}</span><span class="tile-foot">Renewal should be under way</span></button>
        <button class="tile" data-act="cdrill" data-status="d90"><span class="tile-label">${pill('d90')}</span><span class="tile-num">${fmt(c.d90)}</span><span class="tile-foot">Check notice periods</span></button>
      </div>
      <div class="card"><div class="card-head"><div><h2>Next renewals</h2><p class="sub">The agreements that fall due soonest</p></div><a class="btn small" href="#/contracts">All contracts</a></div>
        <div class="table-wrap" style="box-shadow:none"><table><thead><tr><th>Reference</th><th>Counterparty</th><th>Type</th><th>Renewal date</th><th class="num">Days left</th><th>Status</th></tr></thead>
        <tbody>${next.map((x) => `<tr class="click" data-act="con" data-id="${x.id}" tabindex="0"><td class="mono">${x.ref}</td><td>${esc(x.party)}</td><td>${DB.conTypes[x.type]}</td><td>${fmtDate(x.exp)}</td><td class="num">${daysText(x.days)}</td><td>${pill(x.st)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No upcoming renewals</td></tr>'}</tbody></table></div></div>`;
    }
    return html;
  }

  /* ---------- Employee files ---------- */
  function filteredDocs() {
    const f = S.staff; const q = f.q.trim().toLowerCase();
    return scopedDocs().filter((d) => {
      const e = DB.employees[d.emp];
      if (f.site !== '' && e.site !== +f.site) return false;
      if (f.type !== '' && d.type !== +f.type) return false;
      if (f.status && d.st !== f.status) return false;
      if (f.month) {
        if (d.exp == null || d.days < 0) return false;
        const dt = new Date(d.exp);
        if (dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') !== f.month) return false;
      }
      return !q || e.key.includes(q);
    });
  }
  function viewStaff() {
    const r = role();
    if (r.staff === 'none') return locked('Employee files', 'Passports, visas and IDs are personal data, so only HR and the visa team can open them.');
    const f = S.staff; const rows = filteredDocs();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE)); if (f.page > pages) f.page = pages;
    const slice = rows.slice((f.page - 1) * PAGE, f.page * PAGE);
    const full = r.staff === 'full';
    const monthLabel = f.month ? new Date(f.month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '';
    return `${full ? '' : '<p class="banner"><b>Status only.</b> This role can see whether each document is valid, due or expired, but cannot open the document or see its number.</p>'}
    <div class="toolbar">
      <input type="search" id="sq" placeholder="Search by employee name or number" value="${esc(f.q)}" aria-label="Search employees">
      ${r.site == null ? `<select data-filter="staff.site" aria-label="Site">${options(DB.sites, f.site, 'All sites')}</select>` : ''}
      <select data-filter="staff.type" aria-label="Document type">${options(DB.docTypes.map((t) => t.name), f.type, 'All document types')}</select>
      <select data-filter="staff.status" aria-label="Status">${statusOptions(f.status, ['expired', 'd30', 'd90', 'valid', 'missing'])}</select>
      ${f.month ? `<span class="chip">Expires in ${monthLabel}<button data-act="clearmonth" aria-label="Remove month filter">×</button></span>` : ''}
      <button class="btn" data-act="export-staff">Export CSV</button>
      ${full ? '<button class="btn primary" data-act="add-emp">Add employee</button>' : ''}
    </div>
    <p class="count">${fmt(rows.length)} documents · most urgent first</p>
    <div class="table-wrap"><table><thead><tr><th>Employee no.</th><th>Name</th><th>Site</th><th>Document</th><th>Document no.</th><th>Expiry date</th><th class="num">Days left</th><th>Status</th></tr></thead>
    <tbody>${slice.map((d) => { const e = DB.employees[d.emp]; return `<tr class="click" data-act="emp" data-id="${e.idx}" tabindex="0">
      <td class="mono">${e.id}</td><td>${esc(e.name)}</td><td>${esc(DB.sites[e.site])}</td><td>${DB.docTypes[d.type].name}</td>
      <td class="${full ? 'mono' : 'muted'}">${d.no == null ? '—' : full ? esc(d.no) : 'Restricted'}</td><td>${fmtDate(d.exp)}</td><td class="num">${daysText(d.days)}</td><td>${pill(d.st)}</td></tr>`; }).join('')
      || '<tr><td colspan="8" class="empty">No documents match these filters</td></tr>'}</tbody></table></div>
    ${pager(rows.length, f.page, 'staff')}`;
  }

  /* ---------- Contracts ---------- */
  function filteredContracts() {
    const f = S.con; const q = f.q.trim().toLowerCase();
    return scopedContracts().filter((c) => (f.type === '' || c.type === +f.type) && (!f.status || c.st === f.status) && (!q || c.key.includes(q)));
  }
  function viewContracts() {
    const r = role();
    if (r.contracts === 'none') return locked('Contracts', 'Contract values and terms are limited to the contracts team and management.');
    const f = S.con; const rows = filteredContracts();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE)); if (f.page > pages) f.page = pages;
    const slice = rows.slice((f.page - 1) * PAGE, f.page * PAGE);
    return `${r.contracts === 'full' ? '' : '<p class="banner"><b>View only.</b> This role can read agreements but cannot upload renewals.</p>'}
    <div class="toolbar">
      <input type="search" id="cq" placeholder="Search by reference or counterparty" value="${esc(f.q)}" aria-label="Search contracts">
      <select data-filter="con.type" aria-label="Type">${options(DB.conTypes, f.type, 'All types')}</select>
      <select data-filter="con.status" aria-label="Status">${statusOptions(f.status, ['expired', 'd30', 'd90', 'valid'])}</select>
      <button class="btn" data-act="export-con">Export CSV</button>
      ${r.contracts === 'full' ? '<button class="btn primary" data-act="add-con">Add agreement</button>' : ''}
    </div>
    <p class="count">${fmt(rows.length)} agreements · soonest renewal first</p>
    <div class="table-wrap"><table><thead><tr><th>Reference</th><th>Counterparty</th><th>Type</th><th>Owner</th><th class="num">Value</th><th>Renewal date</th><th class="num">Days left</th><th>Status</th></tr></thead>
    <tbody>${slice.map((c) => `<tr class="click" data-act="con" data-id="${c.id}" tabindex="0"><td class="mono">${c.ref}</td><td>${esc(c.party)}</td><td>${DB.conTypes[c.type]}</td><td>${c.owner}</td>
      <td class="num">${money(c.value)}</td><td>${fmtDate(c.exp)}</td><td class="num">${daysText(c.days)}</td><td>${pill(c.st)}</td></tr>`).join('')
      || '<tr><td colspan="8" class="empty">No agreements match these filters</td></tr>'}</tbody></table></div>
    ${pager(rows.length, f.page, 'con')}`;
  }

  /* ---------- Alerts ---------- */
  function alertSets() {
    const docs = scopedDocs(); const cons = scopedContracts();
    const pickDays = (list, n) => list.filter((x) => x.days === n);
    return [
      { key: 'r90', label: 'First reminder', when: '90 days before expiry', to: 'Document owner', docs: pickDays(docs, 90), cons: pickDays(cons, 90) },
      { key: 'r60', label: 'Second reminder', when: '60 days before expiry', to: 'Document owner', docs: pickDays(docs, 60), cons: pickDays(cons, 60) },
      { key: 'r30', label: 'Final reminder', when: '30 days before expiry', to: 'Owner and their manager', docs: pickDays(docs, 30), cons: pickDays(cons, 30) },
      { key: 'esc', label: 'Escalation', when: 'Already expired', to: 'System owner', docs: docs.filter((x) => x.st === 'expired'), cons: cons.filter((x) => x.st === 'expired') },
    ];
  }
  function viewAlerts() {
    const sets = alertSets();
    const total = sets.reduce((a, s) => a + s.docs.length + s.cons.length, 0);
    const sample = [];
    for (const s of sets) {
      for (const d of s.docs.slice(0, 6)) { const e = DB.employees[d.emp]; sample.push([s.label, DB.docTypes[d.type].name + ' · ' + e.name + ' (' + e.id + ')', DB.sites[e.site], d, s.to]); }
      for (const c of s.cons.slice(0, 3)) sample.push([s.label, DB.conTypes[c.type] + ' · ' + c.party + ' (' + c.ref + ')', c.owner, c, s.to]);
    }
    return `<div class="card"><div class="card-head"><div><h2>Reminder rules</h2><p class="sub">The system checks every expiry date once a day and sends reminders automatically.</p></div></div>
      <div class="rules"><span class="pill st-d90"><i>◷</i>90 days</span><span class="pill st-d90"><i>◷</i>60 days</span><span class="pill st-d30"><i>!</i>30 days</span><span class="pill st-expired"><i>✕</i>Escalate when expired</span></div></div>
    <p class="section-title">Today’s run</p>
    <div class="tiles">${sets.map((s) => `<div class="tile"><span class="tile-label">${s.label}</span><span class="tile-num">${fmt(s.docs.length + s.cons.length)}</span><span class="tile-foot">${s.when} · to ${s.to.toLowerCase()}</span></div>`).join('')}</div>
    <div class="toolbar"><p class="count">${fmt(total)} reminders are due to go out today. A selection is listed below.</p><span class="spacer"></span>
      <button class="btn primary" data-act="send" data-n="${total}" ${total ? '' : 'disabled'}>Send today’s reminders</button></div>
    <div class="table-wrap"><table><thead><tr><th>Reminder</th><th>Document</th><th>Site or owner</th><th>Expiry date</th><th>Status</th><th>Goes to</th></tr></thead>
    <tbody>${sample.map((r) => `<tr><td>${r[0]}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${fmtDate(r[3].exp)}</td><td>${pill(r[3].st)}</td><td>${r[4]}</td></tr>`).join('')
      || '<tr><td colspan="6" class="empty">Nothing is due today for this role</td></tr>'}</tbody></table></div>`;
  }

  /* ---------- Audit ---------- */
  function viewAudit() {
    return `<p class="count">Every upload, view and reminder is recorded. Actions you take in this demo appear at the top.</p>
    <div class="table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th></tr></thead>
    <tbody>${DB.audit.slice(0, 60).map((a) => `<tr><td class="muted">${fmtTime(a.t)}</td><td>${esc(a.user)}</td><td>${esc(a.action)}</td><td>${esc(a.target)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  /* ---------- Drawers ---------- */
  function openEmployee(idx) {
    const e = DB.employees[idx]; const r = role(); const full = r.staff === 'full';
    const docs = DB.docs.filter((d) => d.emp === idx).sort((a, b) => a.type - b.type);
    const initials = e.name.split(' ').map((p) => p[0]).join('').slice(0, 2);
    $('#drawer').innerHTML = `<div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Employee file">
      <div class="drawer-head"><span class="avatar" aria-hidden="true">${initials}</span><div><h2>${esc(e.name)}</h2><p>${e.id} · ${esc(e.job)}</p></div><button class="btn small" data-act="close">Close</button></div>
      <div class="card facts"><div><span>Site</span>${esc(DB.sites[e.site])}</div><div><span>Nationality</span>${e.nat}</div><div><span>Joined</span>${fmtDate(e.joined)}</div><div><span>Documents on file</span>${docs.filter((d) => d.exp != null).length} of ${docs.length}</div></div>
      <p class="section-title">Documents</p>
      <div class="list">${docs.map((d) => `<div class="card doc"><div><h3>${DB.docTypes[d.type].name}</h3>
        <p class="meta">${d.exp == null ? 'Not uploaded yet' : `${full ? '<span class="mono">' + esc(d.no) + '</span> · ' : ''}Expires ${fmtDate(d.exp)} · ${daysText(d.days)}`}</p></div>${pill(d.st)}
        <div class="actions"><button class="btn small" data-act="preview" data-id="${d.id}" ${full && d.exp != null ? '' : 'disabled'}>View document</button>
        <button class="btn small ${d.st === 'valid' ? '' : 'primary'}" data-act="renew" data-kind="doc" data-id="${d.id}" ${full ? '' : 'disabled'}>${d.exp == null ? 'Upload' : 'Upload renewal'}</button></div></div>`).join('')}</div>
      ${full ? '' : '<p class="banner">Status only: this role cannot open or replace documents.</p>'}</div>`;
    $('#drawer').hidden = false; $('#drawer').dataset.kind = 'emp'; $('#drawer').dataset.id = idx;
  }
  function openContract(id) {
    const c = DB.contracts.find((x) => x.id === id); const full = role().contracts === 'full';
    $('#drawer').innerHTML = `<div class="drawer-panel" role="dialog" aria-modal="true" aria-label="Contract">
      <div class="drawer-head"><div><h2>${esc(c.party)}</h2><p><span class="mono">${c.ref}</span> · ${DB.conTypes[c.type]}</p></div><button class="btn small" data-act="close">Close</button></div>
      <div class="card facts"><div><span>Status</span>${pill(c.st)}</div><div><span>Value</span>${money(c.value)}</div><div><span>Start date</span>${fmtDate(c.start)}</div><div><span>Renewal date</span>${fmtDate(c.exp)} · ${daysText(c.days)}</div>
        <div><span>Owner</span>${c.owner}</div><div><span>Site</span>${esc(DB.sites[c.site])}</div><div><span>Notice period</span>${c.notice} days</div><div><span>Renews automatically</span>${c.autoRenew ? 'Yes' : 'No'}</div></div>
      <p class="section-title">Attachments</p>
      <div class="list"><div class="card doc"><div><h3>Signed agreement.pdf</h3><p class="meta">Uploaded ${fmtDate(c.start)}</p></div><button class="btn small" data-act="cpreview" data-id="${c.id}">View</button></div>
        <div class="card doc"><div><h3>Trade licence of counterparty.pdf</h3><p class="meta">Uploaded ${fmtDate(c.start)}</p></div><button class="btn small" data-act="cpreview" data-id="${c.id}">View</button></div></div>
      <div><button class="btn primary" data-act="renew" data-kind="con" data-id="${c.id}" ${full ? '' : 'disabled'}>Record renewal</button></div>
      ${full ? '' : '<p class="banner">View only: this role cannot record renewals.</p>'}</div>`;
    $('#drawer').hidden = false; $('#drawer').dataset.kind = 'con'; $('#drawer').dataset.id = id;
    log('Viewed contract', c.ref + ' · ' + c.party);
  }
  function closeDrawer() { $('#drawer').hidden = true; $('#drawer').innerHTML = ''; }
  function refreshDrawer() {
    const d = $('#drawer'); if (d.hidden) return;
    if (d.dataset.kind === 'emp') openEmployee(+d.dataset.id); else openContract(+d.dataset.id);
  }

  /* ---------- Modals ---------- */
  function closeModal() { $('#modal').hidden = true; $('#modal').innerHTML = ''; }
  function previewDoc(id) {
    const d = DB.docs.find((x) => x.id === id); const e = DB.employees[d.emp];
    $('#modal').innerHTML = `<div class="modal-box" role="dialog" aria-modal="true"><h2>${DB.docTypes[d.type].name} · ${esc(e.name)}</h2>
      <div class="sample-doc"><div class="photo"></div><dl><dt>Holder</dt><dd>${esc(e.name)}</dd><dt>Number</dt><dd class="mono">${esc(d.no)}</dd><dt>Nationality</dt><dd>${e.nat}</dd><dt>Expires</dt><dd>${fmtDate(d.exp)}</dd></dl></div>
      <p class="count">In the live system the scanned document opens here. This view has been added to the audit log.</p>
      <div class="modal-actions"><button class="btn" data-act="closemodal">Close</button></div></div>`;
    $('#modal').hidden = false;
    log('Viewed document', DB.docTypes[d.type].name + ' · ' + e.name + ' (' + e.id + ')');
  }
  function renewModal(kind, id) {
    const item = kind === 'doc' ? DB.docs.find((x) => x.id === id) : DB.contracts.find((x) => x.id === id);
    const validity = kind === 'doc' ? DB.docTypes[item.type].validity : 365;
    const base = Math.max(DB.today, item.exp || DB.today);
    const def = new Date(base + validity * DAY).toISOString().slice(0, 10);
    const title = kind === 'doc' ? DB.docTypes[item.type].name + ' · ' + DB.employees[item.emp].name : item.ref + ' · ' + item.party;
    $('#modal').innerHTML = `<form class="modal-box" id="renewForm" data-kind="${kind}" data-id="${id}"><h2>${kind === 'doc' ? (item.exp == null ? 'Upload document' : 'Upload renewed document') : 'Record renewal'}</h2><p class="count">${esc(title)}</p>
      <label>Scanned copy<input type="file" accept="image/*,application/pdf"></label>
      ${kind === 'doc' ? `<label>Document number<input type="text" name="no" value="${esc(item.no || '')}" required></label>` : ''}
      <label>${kind === 'doc' && item.exp == null ? 'Expiry date' : 'New expiry date'}<input type="date" name="exp" value="${def}" required></label>
      <p class="count">Demo only: the file you choose is not uploaded or stored anywhere.</p>
      <div class="modal-actions"><button type="button" class="btn" data-act="closemodal">Cancel</button><button class="btn primary" type="submit">Save</button></div></form>`;
    $('#modal').hidden = false;
  }
  function saveRenewal(form) {
    const kind = form.dataset.kind; const id = +form.dataset.id;
    const val = form.elements.exp.value; if (!val) return;
    const exp = new Date(val + 'T00:00:00').getTime();
    if (kind === 'doc') {
      const d = DB.docs.find((x) => x.id === id); const e = DB.employees[d.emp];
      const first = d.exp == null;
      d.exp = exp; d.no = form.elements.no.value.trim();
      stamp(d); DB.docs.sort(urgency);
      log(first ? 'Uploaded document' : 'Uploaded renewal', DB.docTypes[d.type].name + ' · ' + e.name + ' (' + e.id + ')');
    } else {
      const c = DB.contracts.find((x) => x.id === id);
      c.start = DB.today; c.exp = exp; stamp(c); DB.contracts.sort(urgency);
      log('Recorded renewal', c.ref + ' · ' + c.party);
    }
    closeModal(); refreshDrawer(); render();
    toast('Saved. Status updated and the change added to the audit log.');
  }

  const isoToday = () => new Date(DB.today - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const siteSelect = (sel) => `<select name="site" required>${DB.sites.map((x, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
  function addEmployeeModal() {
    const nextId = 'E' + String(DB.employees.length + 1).padStart(5, '0');
    $('#modal').innerHTML = `<form class="modal-box" id="empForm"><h2>Add employee</h2>
      <p class="count">Employee number <b class="mono">${nextId}</b> is assigned automatically.</p>
      <label>Full name<input type="text" name="name" required maxlength="80" autocomplete="off"></label>
      <div class="two"><label>Nationality<input type="text" name="nat" required maxlength="40"></label>
      <label>Job title<input type="text" name="job" required maxlength="40"></label></div>
      <div class="two"><label>Site${siteSelect(role().site == null ? 0 : role().site)}</label>
      <label>Joining date<input type="date" name="joined" value="${isoToday()}" required></label></div>
      <p class="count">The employee file is created with every required document marked “Missing”, ready for you to upload.</p>
      <div class="modal-actions"><button type="button" class="btn" data-act="closemodal">Cancel</button><button class="btn primary" type="submit">Create employee file</button></div></form>`;
    $('#modal').hidden = false; $('#modal input[name="name"]').focus();
  }
  function saveEmployee(form) {
    const v = form.elements; const name = v.name.value.trim(); if (!name) return;
    const idx = DB.employees.length; const id = 'E' + String(idx + 1).padStart(5, '0');
    DB.employees.push({ idx, id, name, nat: v.nat.value.trim(), site: +v.site.value, job: v.job.value.trim(),
      joined: new Date(v.joined.value + 'T00:00:00').getTime(), key: (id + ' ' + name).toLowerCase() });
    const base = DB.docs.length;
    DB.docTypes.forEach((t, i) => { const d = { id: base + i, emp: idx, type: i, no: null, exp: null }; stamp(d); DB.docs.push(d); });
    DB.docs.sort(urgency);
    log('Created employee file', name + ' (' + id + ')');
    closeModal(); Object.assign(S.staff, { q: id, site: '', type: '', status: '', month: '', page: 1 });
    if (S.view !== 'staff') go('staff'); else render();
    openEmployee(idx);
    toast('Employee file created. Upload the documents to complete it.');
  }
  function addContractModal() {
    const opts = (list) => list.map((x, i) => `<option value="${i}">${esc(x)}</option>`).join('');
    $('#modal').innerHTML = `<form class="modal-box" id="conForm"><h2>Add agreement</h2>
      <label>Counterparty<input type="text" name="party" required maxlength="80" autocomplete="off"></label>
      <div class="two"><label>Type<select name="type">${opts(DB.conTypes)}</select></label>
      <label>Owner<select name="owner">${DB.owners.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label></div>
      <div class="two"><label>Site${siteSelect(0)}</label>
      <label>Value (AED)<input type="number" name="value" min="0" step="1000" value="100000" required></label></div>
      <div class="two"><label>Start date<input type="date" name="start" value="${isoToday()}" required></label>
      <label>Renewal date<input type="date" name="exp" value="${new Date(DB.today + 366 * DAY).toISOString().slice(0, 10)}" required></label></div>
      <div class="two"><label>Notice period<select name="notice"><option>30</option><option>60</option><option>90</option></select></label>
      <label>Signed copy<input type="file" accept="image/*,application/pdf"></label></div>
      <div class="modal-actions"><button type="button" class="btn" data-act="closemodal">Cancel</button><button class="btn primary" type="submit">Save agreement</button></div></form>`;
    $('#modal').hidden = false; $('#modal input[name="party"]').focus();
  }
  function saveContract(form) {
    const v = form.elements; const party = v.party.value.trim(); if (!party) return;
    const id = DB.contracts.length; const ref = 'CT-' + new Date(DB.today).getFullYear() + '-' + String(id + 1).padStart(4, '0');
    const c = { id, ref, party, type: +v.type.value, owner: v.owner.value, site: +v.site.value, value: +v.value.value || 0,
      start: new Date(v.start.value + 'T00:00:00').getTime(), exp: new Date(v.exp.value + 'T00:00:00').getTime(),
      notice: +v.notice.value, autoRenew: false, key: (ref + ' ' + party).toLowerCase() };
    stamp(c); DB.contracts.push(c); DB.contracts.sort(urgency);
    log('Added agreement', ref + ' · ' + party);
    closeModal(); Object.assign(S.con, { q: ref, type: '', status: '', page: 1 }); render();
    toast('Agreement ' + ref + ' added.');
  }

  /* ---------- Render and routing ---------- */
  const TITLES = { dashboard: 'Dashboard', staff: 'Employee files', contracts: 'Contracts', alerts: 'Alerts', audit: 'Audit log' };
  const VIEWS = { dashboard: viewDashboard, staff: viewStaff, contracts: viewContracts, alerts: viewAlerts, audit: viewAudit };
  function render(keepFocus) {
    const active = keepFocus && document.activeElement && document.activeElement.id;
    const pos = active ? document.activeElement.selectionStart : null;
    $('#title').textContent = TITLES[S.view];
    $('#view').innerHTML = VIEWS[S.view]();
    document.querySelectorAll('#nav a').forEach((a) => {
      a.classList.toggle('on', a.dataset.view === S.view);
      a.classList.toggle('locked', (a.dataset.view === 'staff' && role().staff === 'none') || (a.dataset.view === 'contracts' && role().contracts === 'none'));
    });
    if (active) { const el = document.getElementById(active); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) { /* not a text field */ } } }
  }
  function route() {
    const v = (location.hash.replace('#/', '') || 'dashboard');
    S.view = VIEWS[v] ? v : 'dashboard';
    closeDrawer(); render(); window.scrollTo(0, 0);
  }
  function go(view) { if (location.hash === '#/' + view) route(); else location.hash = '#/' + view; }

  /* ---------- Events ---------- */
  document.addEventListener('click', (ev) => {
    if (ev.target === $('#drawer')) return closeDrawer();
    if (ev.target === $('#modal')) return closeModal();
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act;
    if (a === 'page') { S[el.dataset.key].page = +el.dataset.to; render(); window.scrollTo(0, 0); }
    else if (a === 'drill') { Object.assign(S.staff, { q: '', site: el.dataset.site || '', type: el.dataset.type || '', status: el.dataset.status || '', month: '', page: 1 }); go('staff'); }
    else if (a === 'month') { Object.assign(S.staff, { q: '', site: '', type: '', status: '', month: el.dataset.month, page: 1 }); go('staff'); }
    else if (a === 'cdrill') { Object.assign(S.con, { q: '', type: '', status: el.dataset.status, page: 1 }); go('contracts'); }
    else if (a === 'clearmonth') { S.staff.month = ''; S.staff.page = 1; render(); }
    else if (a === 'emp') openEmployee(+el.dataset.id);
    else if (a === 'con') openContract(+el.dataset.id);
    else if (a === 'close') closeDrawer();
    else if (a === 'closemodal') closeModal();
    else if (a === 'preview') previewDoc(+el.dataset.id);
    else if (a === 'cpreview') toast('In the live system the signed PDF opens here.');
    else if (a === 'renew') renewModal(el.dataset.kind, +el.dataset.id);
    else if (a === 'add-emp') addEmployeeModal();
    else if (a === 'add-con') addContractModal();
    else if (a === 'send') { log('Sent reminders', fmt(+el.dataset.n) + ' reminders for today’s run'); toast(fmt(+el.dataset.n) + ' reminders queued. Demo only: no emails are sent.'); }
    else if (a === 'export-staff') {
      const rows = filteredDocs().slice(0, 5000); const full = role().staff === 'full';
      downloadCsv('staff-documents.csv', ['Employee no', 'Name', 'Site', 'Document', 'Document no', 'Expiry date', 'Days left', 'Status'],
        rows.map((d) => { const e = DB.employees[d.emp]; return [e.id, e.name, DB.sites[e.site], DB.docTypes[d.type].name, full ? d.no : 'Restricted', fmtDate(d.exp), d.days, STATUS[d.st].label]; }));
      log('Exported list', fmt(rows.length) + ' staff documents'); toast('Exported ' + fmt(rows.length) + ' rows.');
    } else if (a === 'export-con') {
      const rows = filteredContracts();
      downloadCsv('contracts.csv', ['Reference', 'Counterparty', 'Type', 'Owner', 'Value AED', 'Renewal date', 'Days left', 'Status'],
        rows.map((c) => [c.ref, c.party, DB.conTypes[c.type], c.owner, c.value, fmtDate(c.exp), c.days, STATUS[c.st].label]));
      log('Exported list', fmt(rows.length) + ' agreements'); toast('Exported ' + fmt(rows.length) + ' rows.');
    }
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else closeDrawer(); }
    if (ev.key === 'Enter' && ev.target.matches('tr.click')) ev.target.click();
  });
  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'sq') { S.staff.q = ev.target.value; S.staff.page = 1; render(true); }
    if (ev.target.id === 'cq') { S.con.q = ev.target.value; S.con.page = 1; render(true); }
  });
  document.addEventListener('change', (ev) => {
    const f = ev.target.dataset.filter; if (!f) return;
    const [group, key] = f.split('.'); S[group][key] = ev.target.value; S[group].page = 1; render();
  });
  document.addEventListener('submit', (ev) => {
    const save = { renewForm: saveRenewal, empForm: saveEmployee, conForm: saveContract }[ev.target.id];
    if (save) { ev.preventDefault(); save(ev.target); }
  });

  /* tooltips for chart marks */
  const tip = $('#tip');
  function showTip(el, x, y) {
    tip.innerHTML = el.dataset.tip; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + 'px';
    tip.style.top = Math.max(8, y - h - 14) + 'px';
  }
  document.addEventListener('mousemove', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) showTip(el, ev.clientX, ev.clientY); else tip.hidden = true; });
  document.addEventListener('focusin', (ev) => { const el = ev.target.closest && ev.target.closest('[data-tip]'); if (el) { const b = el.getBoundingClientRect(); showTip(el, b.left + b.width / 2, b.top); } });
  document.addEventListener('focusout', () => { tip.hidden = true; });

  /* role switcher and theme */
  const roleSel = $('#role');
  roleSel.innerHTML = Object.entries(ROLES).map(([k, r]) => `<option value="${k}">${r.label}</option>`).join('');
  roleSel.addEventListener('change', () => { S.role = roleSel.value; S.staff.page = 1; S.con.page = 1; closeDrawer(); render(); toast('Now viewing as ' + role().label + '.'); });
  const root = document.documentElement;
  let theme = null;
  try { theme = localStorage.getItem('dcc-theme'); } catch (e) { /* storage unavailable */ }
  if (!theme) theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.dataset.theme = theme;
  $('#theme').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark'; root.dataset.theme = theme;
    try { localStorage.setItem('dcc-theme', theme); } catch (e) { /* storage unavailable */ }
  });

  window.addEventListener('hashchange', route);
  route();
})();
