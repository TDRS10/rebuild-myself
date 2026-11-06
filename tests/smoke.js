/* راجع لنفسي — اختبار دخان للواجهة بدون متصفح (DOM مُحاكى، بلا اعتماديات).
   يشغّل store.js + app.js ويتحقق من عرض كل الصفحات التسع. شغّل: node tests/smoke.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');

const mem = {};
const handlers = { window: {}, doc: {} };
function stubEl() {
  return {
    innerHTML: '', hidden: false, value: '', textContent: '',
    dataset: {}, style: {}, elements: { namedItem: () => stubEl() },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, focus() {}, scrollIntoView() {}, click() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return stubEl(); }, nextElementSibling: null,
    getAttribute() { return null; }
  };
}
const els = {};
const documentStub = {
  querySelector: s => els[s] || (els[s] = stubEl()),
  querySelectorAll: () => [],
  addEventListener: (t, fn) => { (handlers.doc[t] = handlers.doc[t] || []).push(fn); },
  createElement: () => stubEl(),
};
const sandbox = {
  console, setTimeout, clearTimeout, requestAnimationFrame: cb => cb(),
  matchMedia: () => ({ matches: false }),
  localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } },
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  location: { hash: '' },
  document: documentStub,
  navigator: {},
  Notification: undefined,
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  FormData: class {},
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.addEventListener = (t, fn) => { (handlers.window[t] = handlers.window[t] || []).push(fn); };
sandbox.scrollTo = () => {};
vm.createContext(sandbox);

vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8'), sandbox);
assert.ok(sandbox.Store, 'الوحدة حمّلت Store');

function goto(route) {
  sandbox.location.hash = '#/' + route;
  (handlers.window.hashchange || []).forEach(fn => fn());
  return els['#view'].innerHTML;
}
const expect = {
  home: 'حالتك الآن', mind: 'استعادة نفسي', money: 'أموالي', work: 'شغلي',
  boundaries: 'حدودي تحميني', goals: 'أهداف المستقبل', challenges: 'التحديات',
  reports: 'التقارير', settings: 'الإعدادات'
};
for (const [route, marker] of Object.entries(expect)) {
  const html = goto(route);
  assert.ok(html.includes(marker), route + ' يعرض "' + marker + '" (الطول ' + html.length + ')');
  console.log('  ✓ صفحة', route, '(' + html.length + ' حرف)');
}

// إنشاء بيانات ثم التحقق أن الصفحات تعرضها دون كسر
sandbox.Store.addIncome(2000, sandbox.Store.today(), 'راتب', true);
sandbox.Store.saveWork({ date: sandbox.Store.today(), orders: 8, price: 15, bonus: 20, tips: 10, expense: 30, hours: 3 });
sandbox.Store.state.goals.push({ id: 'g1', name: 'شراء موتوسيكل', target: 500, deadline: '' });
sandbox.Store.depositSaving(100, sandbox.Store.today(), 'للموتوسيكل', 'g1');
sandbox.Store.save();
assert.ok(goto('home').includes('رصيدي المتاح'), 'الرئيسية تعرض الرصيد بعد البيانات');
assert.ok(goto('money').includes('محفظة التحويش'), 'صفحة الأموال تعرض المحفظة');
assert.ok(goto('goals').includes('شراء موتوسيكل'), 'الأهداف تعرض الهدف الجديد');
assert.ok(goto('work').includes('صافي اليوم'), 'صفحة الشغل تعرض الصافي');
console.log('  ✓ عرض البيانات في كل الصفحات بعد التسجيل');

// الحفظ بعد إعادة التحميل: سياق جديد بنفس التخزين
const mem2 = mem;
const sandbox2 = Object.assign(Object.create(null), sandbox, {});
sandbox2.localStorage = { getItem: k => (k in mem2 ? mem2[k] : null), setItem: (k, v) => { mem2[k] = String(v); }, removeItem: k => { delete mem2[k]; } };
sandbox2.window = sandbox2; sandbox2.self = sandbox2;
vm.createContext(sandbox2);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8'), sandbox2);
assert.strictEqual(sandbox2.Store.wallet(), 900, 'المحفظة محفوظة بعد إعادة التحميل (2000×40% + 100)');
console.log('  ✓ البيانات محفوظة بعد إعادة التحميل');

console.log('\nنجح اختبار الدخان — كل الصفحات تُعرض والبيانات محفوظة');
