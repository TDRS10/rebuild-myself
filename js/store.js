/* راجع لنفسي — طبقة البيانات والحسابات.
   كل شيء LocalStorage محلي، لا خادم ولا شبكة. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.Store = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const KEY = 'raj3_nafsi_v1';
  const CATS = {
    food: 'أكل', transport: 'مواصلات', outings: 'خروجات',
    installments: 'أقساط وديون', gifts: 'هدايا ومساعدات',
    needs: 'احتياجات أساسية', commitments: 'التزامات شخصية', other: 'أخرى'
  };
  const GROUPS = {
    needs: ['food', 'transport', 'needs'],
    commitments: ['installments', 'gifts', 'commitments'],
    fun: ['outings', 'other']
  };

  /* ---------- تواريخ (بتوقيت الجهاز) ---------- */
  function iso(d) {
    const x = (d instanceof Date) ? d : new Date();
    return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
  }
  function today() { return iso(new Date()); }
  function addDays(dateStr, n) {
    const p = dateStr.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function daysBetween(a, b) { // عدد الأيام من a إلى b (بما فيهما)
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    const da = new Date(pa[0], pa[1] - 1, pa[2]), db = new Date(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / 86400000) + 1;
  }
  function weekRange(offset) { // 0 = آخر7 أيام، -1 = ال7 التي قبلها
    const end = addDays(today(), (offset || 0) * 7);
    return { from: addDays(end, -6), to: end };
  }
  function monthRange(offset) { // 0 = الشهر الحالي
    const n = new Date(); n.setDate(1); n.setMonth(n.getMonth() + (offset || 0));
    const from = iso(n);
    const last = new Date(n.getFullYear(), n.getMonth() + 1, 0);
    return { from, to: iso(last) };
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function num(v) { const n = parseFloat(v); return isFinite(n) ? n : 0; }

  /* ---------- الحالة الافتراضية (فارغة — لا بيانات تجريبية) ---------- */
  function defaults() {
    return {
      settings: {
        currency: 'ج.م',
        splits: { save: 40, needs: 35, commitments: 15, fun: 10 },
        budgets: { outings: 0 },          // ميزانية الخروجات الشهرية، 0 = غير محددة
        bigExpense: 500,                  // تحذير قبل المصروف الكبير
        limits: { spend: 0, gift: 0 },    // حدودي الشخصية للمصروف والهدايا
        pin: ''                           // PIN اختياري (اختصار: مخزّن محليًا كنص، حماية للعرض لا أمان حقيقي)
      },
      daily: {},          // { 'YYYY-MM-DD': {mood,energy,sleep,wentWork,useful,emotionalSpent,diary,annoyed:[],happy:[],wins:[],tasks:{}} }
      customTasks: [],    // [{id,text}]
      pockets: { needs: 0, commitments: 0, fun: 0 },  // مبالغ الـ35/15/10 المتبقية من الدخل
      tx: [],             // {id,date,type:'income'|'expense'|'saving',cat,amount,note,ref}
      work: [],           // {id,date,orders,price,bonus,tips,expense,hours,txRef}
      goals: [],          // {id,name,target,deadline,created}
      boundaries: [],     // {id,date,text,cantAfford,newInstallment,cancelledWork}
      notes: '',          // مساحة خاصة — لا تُرسل لأي جهة
      challenges: {},     // {id:{status,start,attempts}}
      lastNotify: ''      // آخر يوم أُرسل فيه تنبيه
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaults();
      const s = JSON.parse(raw);
      const d = defaults();
      // دمج سطحي لضمان وجود كل الحقول عند تحديث النسخة
      s.settings = Object.assign(d.settings, s.settings || {});
      s.settings.splits = Object.assign(d.settings.splits, (s.settings || {}).splits || {});
      s.settings.budgets = Object.assign(d.settings.budgets, (s.settings || {}).budgets || {});
      s.settings.limits = Object.assign(d.settings.limits, (s.settings || {}).limits || {});
      s.pockets = Object.assign(d.pockets, s.pockets || {});
      s.daily = s.daily || {}; s.customTasks = s.customTasks || []; s.tx = s.tx || [];
      s.work = s.work || []; s.goals = s.goals || []; s.boundaries = s.boundaries || [];
      s.challenges = s.challenges || {}; s.notes = s.notes || ''; s.lastNotify = s.lastNotify || '';
      return s;
    } catch (e) { return defaults(); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ذاكرة ممتلئة */ } }
  function replaceAll(obj) { state = Object.assign(defaults(), obj); save(); }
  function resetAll() { state = defaults(); save(); }

  /* ---------- الحركة المالية ---------- */
  function addTx(t) {
    const tx = { id: uid(), date: t.date || today(), type: t.type, cat: t.cat || '', amount: num(t.amount), note: t.note || '', ref: t.ref || '' };
    state.tx.push(tx); save(); return tx;
  }
  function delTx(id) { state.tx = state.tx.filter(t => t.id !== id); save(); }
  function txInRange(from, to, type) {
    return state.tx.filter(t => (!type || t.type === type) && t.date >= from && t.date <= to);
  }
  function sum(list) { return list.reduce((a, t) => a + t.amount, 0); }

  function income(from, to) { return sum(txInRange(from, to, 'income')); }
  function expenses(from, to) { return sum(txInRange(from, to, 'expense')); }
  function savedBetween(from, to) { return sum(txInRange(from, to, 'saving')); }

  function spentByCat(from, to) {
    const out = {};
    txInRange(from, to, 'expense').forEach(t => { out[t.cat] = (out[t.cat] || 0) + t.amount; });
    return out;
  }
  function spentInGroup(group, from, to) {
    const cats = GROUPS[group] || [];
    return txInRange(from, to, 'expense').filter(t => cats.indexOf(t.cat) > -1).reduce((a, t) => a + t.amount, 0);
  }

  // الرصيد المتاح = الدخل − المصروف − التحويش (التحويش لا يُحسب فلوسًا للصرف)
  function available() {
    return state.tx.reduce((a, t) => a + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : t.type === 'saving' ? -t.amount : 0), 0);
  }
  // محفظة التحويش = إجمالي ما حُوّش (بما فيه الموجّه لأهداف)
  function wallet() { return state.tx.filter(t => t.type === 'saving').reduce((a, t) => a + t.amount, 0); }

  /* ---------- الدخل والتقسيم التلقائي ---------- */
  // يضيف دخلًا + يحوّل نسب الادخار فورًا للتحويش + يسجّل مبالغ الاحتياج/الالتزامات/الترفيه للصرف
  function addIncome(amount, date, note, autoSplit) {
    amount = num(amount);
    const tx = addTx({ type: 'income', amount, date, note });
    const sp = state.settings.splits;
    const result = { saved: 0, needs: 0, commitments: 0, fun: 0 };
    if (autoSplit && amount > 0) {
      addTx({ type: 'saving', amount: amount * sp.save / 100, date, note: 'ادخار من دخل' });
      state.pockets.needs += amount * sp.needs / 100;
      state.pockets.commitments += amount * sp.commitments / 100;
      state.pockets.fun += amount * sp.fun / 100;
      result.saved = amount * sp.save / 100;
      result.needs = amount * sp.needs / 100;
      result.commitments = amount * sp.commitments / 100;
      result.fun = amount * sp.fun / 100;
      save();
    }
    return { tx, result };
  }

  /* ---------- التحويش ---------- */
  function depositSaving(amount, date, note, goalId) {
    return addTx({ type: 'saving', amount, date, note: note || 'إيداع في التحويش', ref: goalId ? 'goal:' + goalId : '' });
  }
  function goalSaved(goalId) {
    return state.tx.filter(t => t.type === 'saving' && t.ref === 'goal:' + goalId).reduce((a, t) => a + t.amount, 0);
  }

  /* ---------- العمل (طلبات) ---------- */
  function workNet(e) { return num(e.orders) * num(e.price) + num(e.bonus) + num(e.tips) - num(e.expense); }
  // حفظ يوم عمل: يُنشئ/يحدّث حركة دخل مرتبطة حتى لا يُحتسب الدخل مرتين
  function saveWork(e) {
    e.date = e.date || today();
    const net = workNet(e);
    let entry = e.id ? state.work.find(w => w.id === e.id) : null;
    if (!entry) {
      entry = Object.assign({}, e, { id: uid() });
      state.work.push(entry);
      const t = addTx({ type: 'income', amount: net, date: entry.date, note: 'دخل الطلبات', ref: 'work:' + entry.id });
      entry.txRef = t.id;
    } else {
      Object.assign(entry, e);
      const t = state.tx.find(x => x.id === entry.txRef);
      if (t) { t.amount = net; t.date = entry.date; }
      else { const nt = addTx({ type: 'income', amount: net, date: entry.date, note: 'دخل الطلبات', ref: 'work:' + entry.id }); entry.txRef = nt.id; }
    }
    save(); return entry;
  }
  function delWork(id) {
    const entry = state.work.find(w => w.id === id);
    if (entry && entry.txRef) state.tx = state.tx.filter(t => t.id !== entry.txRef);
    state.work = state.work.filter(w => w.id !== id); save();
  }
  function workInRange(from, to) { return state.work.filter(w => w.date >= from && w.date <= to); }
  function workTotals(list) {
    return list.reduce((a, w) => ({
      net: a.net + workNet(w), hours: a.hours + num(w.hours),
      orders: a.orders + num(w.orders), tips: a.tips + num(w.tips) + num(w.bonus)
    }), { net: 0, hours: 0, orders: 0, tips: 0 });
  }

  /* ---------- السلاسل (Streaks) ---------- */
  function streak(hasDay) {
    let d = today();
    if (!hasDay(d)) d = addDays(d, -1);   // يسمح بيوم لم يُسجَّل بعد
    let n = 0;
    while (hasDay(d) && n < 3650) { n++; d = addDays(d, -1); }
    return n;
  }
  function workStreak() {
    const days = {}; state.work.forEach(w => days[w.date] = 1);
    return streak(d => !!days[d]);
  }
  function planStreak() {
    return streak(d => { const r = state.daily[d]; return !!(r && r.mood > 0); });
  }

  /* ---------- الأهداف ---------- */
  function goalProgress(g) {
    const saved = goalSaved(g.id);
    return { saved, pct: g.target > 0 ? Math.min(100, Math.round(saved / g.target * 100)) : 0 };
  }
  function goalsOverall() {
    const gs = state.goals.filter(g => g.target > 0);
    if (!gs.length) return null;
    return Math.round(gs.reduce((a, g) => a + goalProgress(g).pct, 0) / gs.length);
  }

  /* ---------- التحديات ---------- */
  function hasExpenseOn(date, cats) {
    return state.tx.some(t => t.type === 'expense' && t.date === date && (!cats || cats.indexOf(t.cat) > -1));
  }
  const CHALLENGES = [
    { id: 'noRandom', name: '7 أيام بدون صرف عشوائي', days: 7,
      desc: 'لا مصروفات خروجات أو هدايا أو "أخرى" — الأساسيات فقط.',
      test: d => !hasExpenseOn(d, ['outings', 'gifts', 'other']) },
    { id: 'workReg', name: '7 أيام انتظام في العمل', days: 7,
      desc: 'سجّل يوم عمل واحدًا في اليوم دون إجبارك على الإرهاق.',
      test: d => state.work.some(w => w.date === d) },
    { id: 'save30', name: '30 يوم تحويش', days: 30,
      desc: 'أي إيداع في محفظة التحويش كل يوم يكفي.',
      test: d => state.tx.some(t => t.type === 'saving' && t.date === d) },
    { id: 'self30', name: '30 يوم اهتمام بالنفس', days: 30,
      desc: 'سجّل حالتك ومارست نشاطًا مفيدًا في اليوم.',
      test: d => { const r = state.daily[d]; return !!(r && r.mood > 0 && r.useful); } },
    { id: 'noInstall', name: 'أسبوع بدون أقساط جديدة', days: 7,
      desc: 'لا تسجيل أي مصروف أقساط جديدة في الأسبوع.',
      test: d => !hasExpenseOn(d, ['installments']) },
    { id: 'noBigOuting', name: 'أسبوع من غير خروجات مكالفة', days: 7,
      desc: 'خروجات اليوم لا تتجاوز حصتك اليومية من الميزانية.',
      test: function (d) {
        const spent = state.tx.filter(t => t.type === 'expense' && t.date === d && t.cat === 'outings').reduce((a, t) => a + t.amount, 0);
        const budget = state.settings.budgets.outings;
        const cap = budget > 0 ? budget / 30 : state.settings.bigExpense; // shortcut: بلا ميزانية نستخدم حد المصروف الكبير
        return spent <= cap;
      } }
  ];
  // تقدّم يومي متتابع من تاريخ البدء: يوم ماضٍ فاشل يوقف السلسلة، ويوم اليوم الفاشل مؤجَّل
  function challengeProgress(def) {
    const c = state.challenges[def.id];
    if (!c || c.status !== 'active') return null;
    let d = c.start, ok = 0, broken = false;
    const t = today();
    while (d <= t) {
      if (def.test(d)) ok++;
      else if (d !== t) { broken = true; break; }
      d = addDays(d, 1);
    }
    return { ok, broken, done: ok >= def.days };
  }
  function startChallenge(id) {
    state.challenges[id] = { status: 'active', start: today(), attempts: (state.challenges[id] && state.challenges[id].attempts) || 0 };
    save();
  }
  function stopChallenge(id) {
    const c = state.challenges[id]; if (!c) return;
    c.status = 'stopped'; save();
  }
  function retryChallenge(id) {
    const c = state.challenges[id];
    state.challenges[id] = { status: 'active', start: today(), attempts: ((c && c.attempts) || 0) + 1 };
    save();
  }

  /* ---------- محاكي التحويش (بناءً على أرقامك المسجّلة) ---------- */
  function projection() {
    const from = addDays(today(), -29);
    const inc = income(from, today());
    const sav = savedBetween(from, today());
    const sp = state.settings.splits.save / 100;
    // إن لم تُحوَّش فعليًا: نبني على الدخل الحقيقي × نسبة الادخار المعدّلة (مذكورة في العرض)
    const monthly = sav > 0 ? sav : inc * sp;
    const m = months => ({
      conservative: Math.round(monthly * 0.5 * months),
      medium: Math.round(monthly * months),
      optimistic: Math.round(monthly * 1.5 * months)
    });
    return { basedOnActual: sav > 0, monthly: Math.round(monthly), income30: inc, saved30: sav,
      m1: m(1), m3: m(3), m6: m(6), m12: m(12) };
  }

  /* ---------- التنبيهات الداخلية ---------- */
  function alerts() {
    const out = [], t = today(), st = state.settings;
    const spentToday = state.tx.some(x => x.type === 'expense' && x.date === t);
    const workToday = state.work.some(w => w.date === t);
    const hour = new Date().getHours();

    if (!spentToday && hour >= 18) out.push({ level: 'info', text: 'لم تسجّل مصروفات اليوم بعد — دقيقتان تكفيان.' });
    if (!workToday && hour >= 15) out.push({ level: 'info', text: 'سجّل دخل طلبات اليوم لتحافظ على سلسلة التزامك.' });

    const mr = monthRange(0);
    const outings = spentInGroup('fun', mr.from, mr.to);
    const budget = st.budgets.outings || state.pockets.fun;
    if (budget > 0 && outings > 0) {
      const pct = outings / budget * 100;
      if (pct >= 100) out.push({ level: 'warn', text: 'تجاوزت ميزانية الخروجات لهذا الشهر. توقف وراجع أولوياتك بهدوء.' });
      else if (pct >= 80) out.push({ level: 'warn', text: 'اقتربت من ميزانية الخروجات (' + Math.round(pct) + '%). خفّف قبل نهاية الشهر.' });
    }
    if (st.limits.spend > 0) {
      const monthExp = expenses(mr.from, mr.to);
      if (monthExp > st.limits.spend) out.push({ level: 'warn', text: 'مصروف الشهر تجاوز حدك الذي حددته لنفسك.' });
    }
    const gs = state.goals.filter(g => g.target > 0 && g.deadline);
    const soon = gs.find(g => g.deadline >= t && daysBetween(t, g.deadline) <= 7 && goalProgress(g).pct < 100);
    if (soon) out.push({ level: 'info', text: 'هدف "' + soon.name + '" موعده قريب — تذكّر أهداف الأسبوع.' });

    const active = CHALLENGES.map(c => ({ def: c, p: challengeProgress(c) })).filter(x => x.p && !x.p.broken && !x.p.done);
    if (active.length) out.push({ level: 'info', text: 'لديك ' + active.length + ' تحدٍّ نشطًا — خطوة صغيرة اليوم تكفي.' });

    const prev = weekRange(-1), cur = weekRange(0);
    if (savedBetween(prev.from, prev.to) > 0 && savedBetween(cur.from, cur.to) > savedBetween(prev.from, prev.to))
      out.push({ level: 'good', text: 'تحويشك هذا الأسبوع أعلى من الأسبوع الماضي — استمر، أنت على الطريق.' });

    if (state.daily[t] && state.daily[t].mood >= 7) out.push({ level: 'good', text: 'حالتك النفسية اليوم ممتازة — اغتنمها في خطوة صغيرة.' });
    return out;
  }

  /* ---------- PIN ---------- */
  function checkPin(p) { return !state.settings.pin || state.settings.pin === p; }
  function setPin(p) { state.settings.pin = p || ''; save(); }
  function clearPin() { state.settings.pin = ''; save(); }

  /* ---------- تصدير/استيراد ---------- */
  function exportJSON() { return JSON.stringify(state, null, 2); }
  function importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.tx) || !obj.settings)
      throw new Error('ملف غير صالح');
    replaceAll(obj);
  }

  /* ---------- عقل الموقع: تحليل البيانات واقتراح شيء واحد ---------- */
  function advise() {
    const out = [], t = today(), st = state.settings;
    const mr = monthRange(0), wr = weekRange(0);
    const inc = income(mr.from, mr.to), exp = expenses(mr.from, mr.to);
    const sav = savedBetween(mr.from, mr.to);
    const wk = workTotals(workInRange(wr.from, wr.to));
    const lastWk = workTotals(workInRange(addDays(wr.from, -7), addDays(wr.to, -7)));
    const moods = []; for (let i = 0; i < 7; i++) { const r = state.daily[addDays(t, -i)]; if (r && r.mood > 0) moods.push(r.mood); }
    const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;
    const activeCh = CHALLENGES.map(c => challengeProgress(c)).filter(p => p && !p.broken && !p.done).length;
    const goals = state.goals.filter(g => g.target > 0);

    // مال
    if (inc > 0) {
      const spendPct = Math.round(exp / inc * 100), keepPct = 100 - spendPct;
      if (spendPct > 85) out.push({ level: 'warn', icon: '💸', title: 'بتصرف أسرع من دخلك', text: 'مصرفك ' + spendPct + '% من دخلك الشهر ده. جرّب تأجيل أي مصروف مش أساسي 48 ساعة قبل قراره.' });
      else if (sav > 0 && keepPct >= 40) out.push({ level: 'good', icon: '🌱', title: 'إيداعك ماشي صح', text: 'احتفظت بـ ' + keepPct + '% من دخلك الشهر ده. قسّم نفسك على نفس النسبة الشهر الجاي.' });
    }
    const byCat = spentByCat(mr.from, mr.to), topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    if (topCat && inc > 0 && (topCat[1] === exp)) {
      const name = CATS[topCat[0]] || topCat[0];
      out.push({ level: 'info', icon: '🔍', title: 'أكتر بند بياخد فلوسك: ' + name, text: 'عدّل متوسط هذا البند 10% بس — ده أسرع توفير بدون ما تحرم نفسك من حاجة.' });
    }

    // شغل
    if (wk.hours >= 40) out.push({ level: 'warn', icon: '🛑', title: 'إسبوعك فوق المعدل', text: wk.hours + ' ساعة عمل هذا الأسبوع. يوم نصفه راحة بيحافظ على شهر كامل من الشغل.' });
    else if (wk.orders > 0 && lastWk.orders > 0 && wk.net < lastWk.net * 0.8) out.push({ level: 'info', icon: '📉', title: 'صافي الأسبوع نازل عن الأسبوع الماضي', text: 'الفرق مش دايمًا جهد — راجع أوقات الذروة. ساعات أقل في وقت صح بتحسن الناتج.' });

    // نفسي
    if (avgMood !== null && moods.length >= 3) {
      if (avgMood < 4) out.push({ level: 'warn', icon: '💚', title: 'حالتك النفسية محتاجة وقفة', text: 'متوسط آخر ' + moods.length + ' أيام ' + Math.round(avgMood * 10) / 10 + '/10. ابدأ بتحدي «اهتمام بالنفس» — خطوة واحدة في اليوم تكفي.' });
      else if (avgMood >= 7) out.push({ level: 'good', icon: '✨', title: 'فترة نفسية كويسة', text: 'متوسط مزاجك ' + Math.round(avgMood * 10) / 10 + '/10. الفترات الصح دي هي وقت المراجعة والتحويش، مش وقت المخاطرة في صرف.' });
    }

    // تحديات وأهداف
    if (!activeCh) out.push({ level: 'info', icon: '🔥', title: 'استفد من موتivaيتك الحالي', text: 'مفيش تحدي نشط. البدء بتحدي 7 أيام صغير تحط سلسلة تكمل من نفسها.' });
    if (!goals.length) out.push({ level: 'info', icon: '🎯', title: 'مفيش هدف محدد', text: 'هدف واحد صغير بقيمة واضحة بيتحول من رغبة لطريق — ابدأ باصغر مبلغ ممكن توصل له.' });
    if (!out.length) out.push({ level: 'good', icon: '🌿', title: 'الوضع متزن', text: 'أرقامك مستقرة. قاعدة اليوم: سجّل وواصل — لا تعدّل حاجة شغالة.' });

    const rank = { warn: 0, info: 1, good: 2 };
    return out.sort((a, b) => rank[a.level] - rank[b.level]).slice(0, 6);
  }

  return {
    get state() { return state; },
    CATS, GROUPS, CHALLENGES,
    advise,
    iso, today, addDays, daysBetween, weekRange, monthRange, uid, num, defaults,
    save, replaceAll, resetAll,
    addTx, delTx, txInRange, income, expenses, savedBetween, spentByCat, spentInGroup,
    available, wallet, addIncome, depositSaving, goalSaved,
    workNet, saveWork, delWork, workInRange, workTotals, workStreak, planStreak,
    goalProgress, goalsOverall, challengeProgress, startChallenge, stopChallenge, retryChallenge,
    projection, alerts, checkPin, setPin, clearPin, exportJSON, importJSON
  };
});
