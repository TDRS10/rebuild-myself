/* راجع لنفسي — اختبارات الحسابات والمنطق (شغّل: node tests/test-store.js) */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');

// محاكاة localStorage قبل تحميل الوحدة
const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
  clear: () => { Object.keys(mem).forEach(k => delete mem[k]); }
};

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8');
global.self = global;
eval(src);
const Store = global.Store;

let pass = 0;
function ok(name, fn) { fn(); pass++; console.log('  ✓', name); }
function eq(a, b, msg) { assert.strictEqual(a, b, (msg || '') + ' expected ' + b + ' got ' + a); }
function approx(a, b, msg) { assert.ok(Math.abs(a - b) < 0.01, (msg || '') + ' expected ~' + b + ' got ' + a); }

const T = Store.today(), Y = Store.addDays(T, -1), W = Store.weekRange(0), M = Store.monthRange(0);

console.log('راجع لنفسي — الاختبارات\n');

// 1) البداية فارغة (لا بيانات تجريبية)
ok('يبدأ فارغًا', () => {
  eq(Store.available(), 0); eq(Store.wallet(), 0);
  eq(Store.state.tx.length, 0); eq(Store.state.work.length, 0);
});

// 2) الدخل والتقسيم التلقائي 40/35/15/10
ok('تقسيم الدخل التلقائي', () => {
  const r = Store.addIncome(1000, T, 'راتب', true);
  approx(r.result.saved, 400, 'ادخار'); approx(r.result.needs, 350, 'أساسي');
  approx(r.result.commitments, 150, 'التزامات'); approx(r.result.fun, 100, 'ترفيه');
  approx(Store.wallet(), 400, 'محفظة التحويش');
  approx(Store.available(), 600, 'المتاح بعد الادخار');
  approx(Store.state.pockets.needs, 350, 'جيب الأساسي');
});

// 3) التحويش لا يُحسب فلوسًا للصرف (يُخصم من المتاح)
ok('التحويش لا يدخل الرصيد المتاح', () => {
  Store.depositSaving(200, T, 'إيداع يدوي');
  approx(Store.wallet(), 600, 'محفظة'); approx(Store.available(), 400, 'المتاح بعد الادخار');
});

// 4) المصروف ينقص المتاح + التصنيف
ok('المصروف والتصنيف', () => {
  Store.addTx({ type: 'expense', amount: 100, cat: 'food', date: T, note: 'غداء' });
  Store.addTx({ type: 'expense', amount: 50, cat: 'outings', date: T, note: 'خروجة' });
  approx(Store.available(), 250, 'بعد المصروف');
  eq(Store.spentByCat(M.from, M.to).food, 100, 'أكل');
  eq(Store.spentInGroup('fun', M.from, M.to), 50, 'مجموعة الخروجات');
});

// 5) مجاميع أسبوعي/شهري
ok('مجاميع الأسبوع والشهر', () => {
  eq(Store.income(W.from, W.to), 1000, 'دخل الأسبوع');
  eq(Store.expenses(M.from, M.to), 150, 'مصروف الشهر');
  eq(Store.savedBetween(M.from, M.to), 600, 'تحويش الشهر');
});

// 6) العمل: الصافي والحفظ دون مضاعفة الدخل
ok('حساب صافي دخل الطلبات', () => {
  const e = Store.saveWork({ id: '', date: T, orders: 10, price: 20, bonus: 30, tips: 15, expense: 45, hours: 4 });
  eq(Store.workNet(e), 200, 'الصافي = 10×20+30+15−45');
  eq(Store.state.tx.filter(t => t.ref === 'work:' + e.id).length, 1, 'حركة دخل واحدة');
  // تحديث نفس اليوم: لا حركة جديدة
  const before = Store.state.tx.length;
  Store.saveWork({ id: e.id, date: T, orders: 12, price: 20, bonus: 30, tips: 15, expense: 45, hours: 5 });
  eq(Store.state.tx.length, before, 'التحديث لا يضيف حركة');
  eq(Store.available(), 250 + 240, 'المتاح بعد تحديث دخل الطلبات');
  const tot = Store.workTotals(Store.workInRange(W.from, W.to));
  eq(tot.orders, 12, 'إجمالي الطلبات'); eq(tot.hours, 5, 'الساعات');
  eq(Store.workStreak(), 1, 'سلسلة العمل');
});
ok('حذف العمل يحذف دخله', () => {
  const e = Store.saveWork({ id: '', date: Y, orders: 1, price: 10, bonus: 0, tips: 0, expense: 0, hours: 1 });
  const av = Store.available();
  Store.delWork(e.id);
  eq(Store.available(), av - 10, 'الرصيد رجع');
  eq(Store.workStreak(), 1, 'السلسلة تستمر ليوم اليوم');
});

// 7) الأهداف ونسبة الإنجاز
ok('الأهداف: النسبة والربط بالتحويش', () => {
  const g = { id: Store.uid(), name: 'شراء موتوسيكل', target: 1000, deadline: '' };
  Store.state.goals.push(g);
  Store.depositSaving(250, T, 'للموتوسيكل', g.id);
  const p = Store.goalProgress(g);
  eq(p.saved, 250, 'المحفوظ'); eq(p.pct, 25, 'النسبة');
  eq(Store.goalsOverall(), 25, 'متوسط الأهداف');
  Store.depositSaving(900, T, 'زيادة', g.id);
  eq(Store.goalProgress(g).pct, 100, 'النسبة لا تتجاوز 100%');
});

// 8) التحديات: سلسلة صحيحة، كسر، وإعادة دون عقاب
ok('التحديات: بدء وتقدّم وكسر وإعادة', () => {
  const d = Store.CHALLENGES.find(c => c.id === 'save30');
  Store.startChallenge(d.id);
  const p = Store.challengeProgress(d);
  assert.ok(p.ok >= 1, 'يوم التحويش اليوم محسوب');
  eq(p.broken, false, 'غير مكسور');
  Store.stopChallenge(d.id);
  eq(Store.challengeProgress(d), null, 'المتوقف لا يعرض تقدّمًا');
  Store.retryChallenge(d.id);
  eq(Store.state.challenges[d.id].attempts, 1, 'المحاولة تُسجَّل');
  // تحدٍّ: يوم ماضٍ بلا عمل يكسّر السلسلة
  const w = Store.CHALLENGES.find(c => c.id === 'workReg');
  Store.state.challenges[w.id] = { status: 'active', start: Store.addDays(T, -3), attempts: 0 };
  Store.state.work = Store.state.work.filter(x => x.date === T); // الباقي لا عنده عمل
  eq(Store.challengeProgress(w).broken, true, 'يوم فائت بلا عمل يكسر السلسلة');
});

// 9) المحاكي مبني على الأرقام المسجلة
ok('المحاكي: متحفظ/متوسط/متفائل', () => {
  const pr = Store.projection();
  eq(pr.basedOnActual, true, 'قائم على تحويش فعلي');
  assert.ok(pr.monthly > 0, 'متوسط شهري > 0');
  eq(pr.m3.medium, pr.monthly * 3, 'متوسط 3 أشهر');
  eq(pr.m3.conservative, Math.round(pr.monthly * 0.5 * 3), 'متحفظ نصف');
  eq(pr.m12.optimistic, Math.round(pr.monthly * 1.5 * 12), 'متفائل 1.5×');
});

// 10) التنبيهات الداخلية
ok('التنبيهات: ميزانية الخروجات', () => {
  Store.state.settings.budgets.outings = 40; // صرف الخروجات 50 > الميزانية
  const a = Store.alerts();
  assert.ok(a.some(x => x.text.indexOf('ميزانية الخروجات') > -1), 'تحذير الميزانية يظهر');
});

// 11) حفظ وتصدير واستيراد وحذف
ok('الحفظ بعد إعادة التحميل + التصدير/الاستيراد', () => {
  Store.save();
  const json = Store.exportJSON();
  const parsed = JSON.parse(json);
  eq(parsed.tx.length, Store.state.tx.length, 'التصدير يطابق الحالة');
  const n = parsed.tx.length;
  Store.resetAll();
  eq(Store.state.tx.length, 0, 'تصفير');
  Store.importJSON(json);
  eq(Store.state.tx.length, n, 'الاستيراد يعيد البيانات');
  assert.throws(() => Store.importJSON('{}'), /غير صالح/, 'رفض ملف غير صالح');
  mem[Object.keys(mem)[0]] && Store.save();
});

// 12) PIN
ok('PIN اختياري', () => {
  eq(Store.checkPin('1234'), true, 'بلا PIN أي رمز يفتح');
  Store.setPin('2468');
  eq(Store.checkPin('0000'), false, 'رمز خاطئ مرفوض');
  eq(Store.checkPin('2468'), true, 'رمز صحيح مقبول');
  Store.clearPin();
  eq(Store.checkPin('x'), true, 'بعد المسح يفتح');
});

// 13) تواريخ
ok('التواريخ: أسبوع وشهر', () => {
  eq(Store.daysBetween(T, T), 1, 'يوم واحد');
  eq(Store.daysBetween(Y, T), 2, 'يومان');
  eq(Store.daysBetween(W.from, W.to), 7, 'أسبوع 7 أيام');
  eq(Store.monthRange(0).from.slice(0, 7), Store.monthRange(0).to.slice(0, 7), 'الشهر الحالي متماسك');
});

// 14) حذف حركة
ok('حذف حركة مالية', () => {
  const t = Store.addTx({ type: 'expense', amount: 5, date: T, note: 'مؤقت' });
  const n = Store.state.tx.length;
  Store.delTx(t.id);
  eq(Store.state.tx.length, n - 1, 'حُذفت');
});

// 16) عقل الموقع (advise)
ok('عقل الموقع: حلل ويرتّب ويقترح', () => {
  const tips = Store.advise();
  assert.ok(Array.isArray(tips) && tips.length >= 1, 'بيطلع اقتراحات');
  tips.forEach(x => assert.ok(x.level && x.icon && x.title && x.text, 'شكل الاقتراح سليم'));
  assert.ok(tips[0].level === 'warn' || tips[0].level === 'info' || tips[0].level === 'good', 'مستوى معروف');
  // تحذير مالي يطلع قبل الاقتراح الجيد
  Store.addTx({ type: 'expense', amount: 9999, cat: 'other', date: T, note: 'تصرف كبير' });
  const sorted = Store.advise();
  const warnIdx = sorted.findIndex(x => x.level === 'warn');
  const goodIdx = sorted.findIndex(x => x.level === 'good');
  assert.ok(warnIdx === -1 || goodIdx === -1 || warnIdx < goodIdx, 'التحذيرات الأول');
});


// 17) الشات الذكي: المفتاح ما ينشرش في التصدير
ok('التصدير ما بيحملش مفتاح الذكاء الاصطناعي', () => {
  Store.state.settings.aiKey = "sk-or-v1-TESTKEY";
  assert.ok(!Store.exportJSON().includes("TESTKEY"), "المفتاح ظهر في التصدير!");
  eq(Store.state.settings.aiKey, "sk-or-v1-TESTKEY", "المفتاح نفسه لسه محفوظ");
  Store.state.settings.aiKey = "";
});
console.log('\nنجحت ' + pass + ' مجموعة اختبارات — المتاح: ' + Store.available() + '، المحفظة: ' + Store.wallet());
