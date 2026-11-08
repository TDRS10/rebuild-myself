/* راجع لنفسي — الواجهة (Vanilla JS، بدون مكتبات) */
(function () {
  'use strict';
  const S = m => window.Store, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cur = () => S().state.settings.currency || 'ج.م';
  const fmt = n => (n || 0).toLocaleString('en-US') + ' ' + cur();
  const dFmt = ds => { try { return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(ds + 'T12:00:00')); } catch (e) { return ds; } };
  const todayStr = () => S().today();
  const ROUTES = ['home', 'mind', 'money', 'work', 'boundaries', 'goals', 'challenges', 'reports', 'settings', 'advice'];
  const DEFAULT_TASKS = ['اشرب كوب مياه إضافي', 'امشِ 5 دقائق في الهواء', 'رتّب جزءًا صغيرًا من غرفتك', 'اتصل بشخص يدعمك', 'سجّل مصروفًا واحدًا بوعي', 'خد 10 دقائق راحة من غير هاتف', 'اكتب سطرًا واحدًا في مذكراتك'];
  const GOAL_PRESETS = ['سداد الديون', 'تكوين صندوق طوارئ', 'شراء موتوسيكل', 'تطوير اللغة الإنجليزية', 'تطوير مهارات العمل', 'استكمال الدراسة', 'بناء مشروع شخصي'];
  const QUOTES = [
    'خطوة صغيرة اليوم خير من ألف فكرة غدًا.',
    'أنا لا أصلح كل شيء دفعة واحدة، وأكفي أن أبدأ.',
    'الهدوء قوة، والترقّب حكمة.',
    'فلوسي أماني، وحفظها أول شغل نفسي.',
    'يوم بلا صرف عشوائي… يوم انتصار.',
    'التعب إشارة، مش عار. الراحة جزء من الشغل.',
    'أقارن نفسي بأمس، مش بحد تاني.',
    'كل جنيه محفوظ بيبني مستقبل أهدى.',
    'مش مطلوب مني أكون مثالي، مطلوب أكون مستمر.',
    'الحدود حماية، والقول "لا" احترام للنفس.',
    'الطلبات بتخلص، بس صحتي وراحتي باقيين.',
    'أبدأ من حيث أنا، بما أملك، وبقدر استطاعتي.',
    'التقدم مش خط مستقيم، والتراجع ليس فشلًا.',
    'أستحق أبدأ من جديد، بهدوء وبلا لوم.',
    'مصروفي مش ذنب، بس قرار. وأنا قادر أختار.'
  ];
  let reportMode = 'month', mindDate = todayStr();

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._x); t._x = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function dailyRec(date) {
    const st = S().state;
    if (!st.daily[date]) st.daily[date] = { mood: 0, energy: 0, sleep: '', wentWork: false, useful: false, emotionalSpent: false, diary: '', annoyed: [], happy: [], wins: [], tasks: {} };
    return st.daily[date];
  }
  function quoteOfDay() {
    const d = new Date(); const n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
    return QUOTES[n % QUOTES.length];
  }
  function bar(pct, cls) { return '<div class="bar ' + (cls || '') + '"><i style="width:' + Math.max(0, Math.min(100, pct || 0)) + '%"></i></div>'; }
  function catChart(from, to) {
    const by = S().spentByCat(from, to), max = Math.max(1, ...Object.values(by));
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return '<p class="empty">لا مصروفات مسجّلة في الفترة.</p>';
    return '<div class="chart">' + rows.map(([c, v]) =>
      '<div class="row"><span>' + esc(S().CATS[c] || c) + '</span><div class="track"><i style="width:' + Math.round(v / max * 100) + '%"></i></div><span class="amount">' + v.toLocaleString('en-US') + '</span></div>').join('') + '</div>';
  }
  function emptyList(msg) { return '<p class="empty">' + msg + '</p>'; }
  function listItems(items, act, render) {
    if (!items.length) return emptyList('لا شيء بعد.');
    return '<ul class="list">' + items.map((it, i) =>
      '<li><span>' + render(it, i) + '</span><button class="del" data-act="' + act + '" data-i="' + i + '" aria-label="حذف">' + (it._can ? '✏️' : '🗑') + '</button></li>').join('') + '</ul>';
  }

  /* ========== صفحة: الرئيسية ========== */
  function vHome() {
    const st = S().state, t = todayStr(), rec = st.daily[t] || {};
    const mo = S().monthRange(0);
    const inc = S().income(mo.from, mo.to), exp = S().expenses(mo.from, mo.to);
    const go = S().goalsOverall();
    const alerts = S().alerts();
    const checkDays = Object.keys(st.daily).filter(d => st.daily[d].mood > 0).length;
    const h = new Date().getHours();
    const greeting = h < 5 ? 'سهرة هادية؟' : h < 12 ? 'صباح الورد 🌅' : h < 17 ? 'يا نهار مرتب ☀️' : h < 22 ? 'مساء الخير 🌆' : 'ليلة هادية 🌙';
    return `
    <div class="hero">
      <p class="date">${esc(dFmt(t))} · ${greeting}</p>
      <p class="quote">💬 ${esc(quoteOfDay())}</p>
      <button class="btn gold block" data-act="start-day">🌅 ابدأ يومك</button>
    </div>
    ${alerts.length ? '<h2 class="sec-title">تنبيهات اليوم</h2>' + alerts.map(a =>
      '<div class="alert ' + a.level + '"><span>' + (a.level === 'good' ? '✅' : a.level === 'warn' ? '⚠️' : 'ℹ️') + '</span><span>' + esc(a.text) + '</span></div>').join('') : ''}
    ${(() => { const tip = S().advise()[0]; return tip ? '<a href="#/advice" class="card clickable" style="display:block;margin-bottom:4px"><h3>🧠 عقل الموقع</h3><p class="sub">' + esc(tip.title) + '</p></a>' : ''; })()}
    <h2 class="sec-title">حالتك الآن</h2>
    <div class="grid c2">
      <div class="card stat"><h3>حالتي النفسية اليوم</h3><span class="val">${rec.mood ? rec.mood + ' / 10' : '—'}</span><span class="sub">${rec.mood ? (rec.mood >= 7 ? 'يوم جيد، اغتنمه بهدوء' : rec.mood >= 4 ? 'يوم متوسط، خطوة صغيرة تكفي' : 'يوم صعب، الراحة أولوية') : 'لم تسجّل بعد'}</span></div>
      <div class="card stat"><h3>رصيدي المتاح</h3><span class="val">${fmt(S().available())}</span><span class="sub">بعد خصم التحويش</span></div>
      <div class="card stat green"><h3>إجمالي التحويش</h3><span class="val">${fmt(S().wallet())}</span><span class="sub">محفظة منفصلة عن مصروفك</span></div>
      <div class="card stat blue"><h3>أيام الالتزام بالشغل</h3><span class="val">${S().workStreak()} يوم</span><span class="sub">سلسلة متتالية</span></div>
      <div class="card stat"><h3>أيام التزامي بخطتي</h3><span class="val">${S().planStreak()} يوم</span><span class="sub">سجّلتَ حالتك ${checkDays} يومًا إجمالًا</span></div>
      <div class="card stat gold"><h3>التقدّم نحو أهدافي</h3><span class="val">${go === null ? 'لا أهداف' : go + '%'}</span><span class="sub">${go === null ? 'أضف هدفًا من صفحة الأهداف' : 'متوسط إنجاز أهدافك'}</span>${go === null ? '' : bar(go, 'gold')}</div>
    </div>
    <h2 class="sec-title">هذا الشهر</h2>
    <div class="grid c3">
      <div class="card stat"><h3>الدخل</h3><span class="val" style="font-size:1.1rem">${fmt(inc)}</span></div>
      <div class="card stat"><h3>المصروف</h3><span class="val" style="font-size:1.1rem">${fmt(exp)}</span></div>
      <div class="card stat"><h3>صافي الشهر</h3><span class="val" style="font-size:1.1rem">${fmt(inc - exp)}</span></div>
    </div>
    <h2 class="sec-title">إجراءات سريعة</h2>
    <div class="grid c3">
      <a class="card clickable center" href="#/money">💰<br>أموالي</a>
      <a class="card clickable center" href="#/work">🛵<br>شغلي</a>
      <a class="card clickable center" href="#/challenges">🔥<br>التحديات</a>
    </div>`;
  }

  /* شبكة كلم العقل — مودلات مجانية بترتيب الأولوية، واحدة تقع نجرب اللي بعدها */
  const AI_MODELS = ['nvidia/nemotron-3-ultra-550b-a55b:free', 'google/gemma-4-31b-it:free'];
  let aiChat = []; // تاريخ الشات داخل الجلسة فقط
  function chatHtml(pending) {
    return (aiChat.map(m =>
      '<div class="alert ' + (m.role === 'user' ? 'info' : 'good') + '" style="white-space:pre-line"><span>' + (m.role === 'user' ? '🙋' : '🧠') + '</span><span>' + esc(m.text) + '</span></div>').join('')
      + (pending || ''))
      || '<p class="empty">اسأل العقل أي حاجة عن فلوسك أو شغلك أو حالتك.</p>';
  }
  function aiCall(q) {
    const tips = S().advise();
    const mo = S().monthRange(0), wr = S().weekRange(0);
    const wk = S().workTotals(S().workInRange(wr.from, wr.to));
    const moods = []; for (let i = 0; i < 7; i++) { const r = S().state.daily[S().addDays(S().today(), -i)]; if (r && r.mood > 0) moods.push(r.mood); }
    const digest = {
      currency: S().state.settings.currency, available: S().available(), savings: S().wallet(),
      monthIncome: S().income(mo.from, mo.to), monthExpense: S().expenses(mo.from, mo.to),
      workHoursThisWeek: Math.round(wk.hours), ordersThisWeek: wk.orders, netThisWeek: Math.round(wk.net),
      moodAvg7: moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10 : null,
      savingsSplitPct: S().state.settings.splits.save, goals: S().state.goals.map(g => g.name + ': ' + S().goalProgress(g).pct + '%')
    };
    const sys = 'انت "عقل الموقع" في تطبيق "راجع لنفسي" — مدرب مصري ودود بيساعد مُلّاك (سائق طلبيات) يبني توازن نفسي ومالي وعمل بعد ضغط مادي. ' +
      'تكلم عربي مصري بسيط ودافي، ردود قصيرة عملية (3-5 جمل بحد أقصى)، من غير افتراضات عن فلوس ما مش موجودة، ولا عبارات إنشائية جوفاء. ' +
      'لو رقم غير موجود قول صاحبه يسجله الأول. بياناته الحالية: ' + JSON.stringify(digest) +
      ' اقتراحاتك المحلية المحسوبة: ' + tips.map(t => t.level + ':' + t.title).join(' | ');
    const msgs = [{ role: 'system', content: sys }]
      .concat(aiChat.slice(-8).map(m => ({ role: m.role, content: m.text })), [{ role: 'user', content: q }]);
    let lastErr = null;
    return AI_MODELS.reduce((chain, model) => chain.catch(() => fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + S().state.settings.aiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 400, messages: msgs })
    }).then(r => r.json()).then(d => {
      const txt = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (!txt) throw new Error((d.error && d.error.message) || 'ما جاش رد');
      return txt;
    })), Promise.reject());
  }

  /* ========== صفحة: عقل الموقع ========== */
  function vAdvice() {
    const tips = S().advise();
    const person = ['💸', '🛑', '🔍', '📉'].includes(tips[0].icon) ? 'فلوسك' :
      ['💚', '✨', '🛌'].includes(tips[0].icon) ? 'حالتك النفسية' : 'شغلك وخطتك';
    const top = `<div class="alert ${tips[0].level}" style="border-radius:16px;padding:16px">
      <span style="font-size:1.6rem">${tips[0].icon}</span>
      <span><strong style="display:block;margin-bottom:4px">${esc(tips[0].title)}</strong>${esc(tips[0].text)}</span></div>`;
    const rest = tips.slice(1).map(x =>
      '<div class="card" style="margin-bottom:10px"><h3>' + x.icon + ' ' + esc(x.title) + '</h3><p class="sub">' + esc(x.text) + '</p></div>').join('') || emptyList('ده كل اللي لاحظته النهارده.');
    return `
    <h2 class="page-title">🧠 عقل الموقع<small>اقتراحات مبنية على أرقامك انت بس — تحليل محلي على جهازك، لا سيرفر ولا بيانات بتخرج بره.</small></h2>
    <p class="hint">قرأت: دخلك ومصروفك الشهري · ساعات شغلك الأسبوعية · مزاجك آخر 7 أيام · تحدياتك وأهدافك. <strong>${person}</strong> هي نقطة تركيز اليوم.</p>
    ${top}
    <h2 class="sec-title">ملاحظات كمان</h2>
    ${rest}
    <h2 class="sec-title">💬 كلم العقل</h2>
    <div class="card">
      <div id="aiChatOut">${chatHtml('')}</div>
      <form data-form="ai-chat" style="display:flex;gap:8px;margin-top:10px">
        <textarea name="q" placeholder="اسأل عن فلوسك، شغلك، أو حالتك…" maxlength="500" required style="height:64px;flex:1"></textarea>
        <button class="btn sm" type="submit">✈️</button>
      </form>
      <p class="hint mt">الشات الحي محتاج مفتاح — من ⚙️ الإعدادات ← «الذكاء الاصطناعي». كلام الشات بيوصل لخدمة OpenRouter للإجابة.</p>
    </div>`;
  }

  /* ========== صفحة: استعادة نفسي ========== */
  function vMind() {
    const r = dailyRec(mindDate);
    const t = todayStr(), isToday = mindDate === t;
    const slider = (key, label, val) =>
      `<div class="slider-row"><label>${label}</label><input type="range" min="1" max="10" value="${val || 5}" data-mind="${key}"><span class="out">${val || ''}</span></div>`;
    const miniList = (key, title, items) => `
      <h3 class="sec-title">${title}</h3>
      <form data-mini="${key}" style="display:flex;gap:8px"><input name="txt" placeholder="اكتب هنا…" maxlength="120" required style="flex:1"><button class="btn sm" type="submit">➕</button></form>
      ${items.length ? '<ul class="list">' + items.map((x, i) => `<li><span>${esc(x)}</span><button class="del" data-act="mind-del" data-key="${key}" data-i="${i}">🗑</button></li>`).join('') + '</ul>' : emptyList('لا شيء بعد.')}`;
    const tasks = [...DEFAULT_TASKS, ...S().state.customTasks.map(x => x.text)];
    return `
    <h2 class="page-title">💚 استعادة نفسي<small>تتبّع يومي بهدوء — لا تقييم ولا لوم، مجرد ملاحظة.</small></h2>
    <div class="card" style="margin-bottom:12px">
      <div class="row" style="align-items:center">
        <button class="btn sm" data-act="mind-prev">‹ اليوم السابق</button>
        <strong style="flex:1;text-align:center">${esc(dFmt(mindDate))}${isToday ? ' <span class="badge green">اليوم</span>' : ''}</strong>
        <button class="btn sm" data-act="mind-next">التالي ›</button>
      </div>
      ${slider('mood', '😌 حالتي النفسية', r.mood)}
      ${slider('energy', '⚡ مستوى الطاقة', r.energy)}
      <div class="field" style="max-width:260px"><label>😴 جودة النوم</label>
        <select data-mind="sleep"><option value="">— اختر —</option>
        ${['ممتاز', 'جيد', 'متوسط', 'ضعيف', 'سيئ'].map(s => `<option ${r.sleep === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <label class="check"><input type="checkbox" data-mind="wentWork" ${r.wentWork ? 'checked' : ''}> نزلت الشغل اليوم</label>
      <label class="check"><input type="checkbox" data-mind="useful" ${r.useful ? 'checked' : ''}> مارست نشاطًا مفيدًا</label>
      <label class="check"><input type="checkbox" data-mind="emotionalSpent" ${r.emotionalSpent ? 'checked' : ''}> صرفت بسبب الزعل أو التوتر</label>
      <div class="field"><label>📝 مذكرات اليوم</label><textarea data-mind="diary" placeholder="فضفض هنا… كلامك ليك، مش لأي حد.">${esc(r.diary)}</textarea></div>
    </div>
    <div class="grid c2">
      <div>${miniList('annoyed', '😠 أشياء أزعجتني', r.annoyed)}</div>
      <div>${miniList('happy', '😊 أشياء أسعدتني', r.happy)}</div>
    </div>
    ${miniList('wins', '🏆 سجل الإنجازات الصغيرة', r.wins)}
    <div class="note-card">
      <h3>أنا مش مطالب أصلح كل حاجة النهارده</h3>
      <p>مهام صغيرة، من غير ضغط. خلّص واحدة بس ويكفي.</p>
      <form data-taskform style="display:flex;gap:8px;margin:10px 0"><input name="txt" placeholder="مهمة صغيرة من اختيارك…" maxlength="80" style="flex:1"><button class="btn sm" type="submit">➕</button></form>
      ${tasks.map(x => `<label class="check"><input type="checkbox" data-task="${esc(x)}" ${r.tasks[x] ? 'checked' : ''}> ${esc(x)}</label>`).join('')}
    </div>
    <h2 class="sec-title">آخر 14 يومًا — المزاج</h2>
    <div class="chart">${Array.from({ length: 14 }, (_, i) => S().addDays(t, i - 13)).map(d => {
      const m = (S().state.daily[d] || {}).mood || 0;
      return `<div class="row"><span>${d.slice(5)}</span><div class="track"><i style="width:${m * 10}%"></i></div><span class="amount">${m || '—'}</span></div>`;
    }).join('')}</div>`;
  }

  /* ========== صفحة: أموالي ========== */
  function vMoney() {
    const st = S().state, mo = S().monthRange(0), sp = st.settings.splits;
    const outSpent = S().spentInGroup('fun', mo.from, mo.to);
    const budget = st.settings.budgets.outings;
    const wb = st.settings.budgets.outings > 0 ? budget : st.pockets.fun;
    const goalOpts = st.goals.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('');
    const txDesc = [...st.tx].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 40);
    const badge = t => t.type === 'income' ? '<span class="badge green">دخل</span>' : t.type === 'saving' ? '<span class="badge gold">تحويش</span>' : '<span class="badge blue">مصروف</span>';
    return `
    <h2 class="page-title">💰 أموالي وتحويشي<small>محفظة التحويش منفصلة — مش فلوس للصرف.</small></h2>
    <div class="grid c2">
      <div class="card stat"><h3>رصيدي المتاح</h3><span class="val">${fmt(S().available())}</span><span class="sub">دخل − مصروف − تحويش</span></div>
      <div class="card stat gold"><h3>محفظة التحويش 🐖</h3><span class="val">${fmt(S().wallet())}</span><span class="sub">لو مسحتها انسى الحلم 😉</span></div>
      <div class="card stat"><h3>جيب الاحتياجات (35%)</h3><span class="val" style="font-size:1.1rem">${fmt(st.pockets.needs)}</span><span class="sub">أكل ومواصلات</span></div>
      <div class="card stat"><h3>جيب الالتزامات (15%)</h3><span class="val" style="font-size:1.1rem">${fmt(st.pockets.commitments)}</span><span class="sub">أقساط وهدايا</span></div>
      <div class="card stat"><h3>جيب الترفيه (10%)</h3><span class="val" style="font-size:1.1rem">${fmt(st.pockets.fun)}</span><span class="sub">خروجات مسموحة</span></div>
      <div class="card stat"><h3>مصروف الشهر</h3><span class="val" style="font-size:1.1rem">${fmt(S().expenses(mo.from, mo.to))}</span><span class="sub">دخل الشهر ${fmt(S().income(mo.from, mo.to))}</span></div>
    </div>
    ${wb > 0 ? `<div class="alert ${outSpent >= wb ? 'warn' : 'info'}">🎉 خروجات هذا الشهر: ${fmt(outSpent)} من ${fmt(wb)} ${outSpent >= wb ? '— الميزانية خلصت! خفّف لحد آخر الشهر.' : ''}</div>` : ''}
    <div class="alert info">⚠️ أي مصروف ≥ ${fmt(st.settings.bigExpense)} سيطلب تأكيدًا قبل الحفظ.</div>

    <details class="formbox" open><summary>➕ إضافة دخل (مع تقسيم تلقائي ${sp.save}/${sp.needs}/${sp.commitments}/${sp.fun})</summary>
      <form data-form="income"><div class="row">
      <div class="field"><label>المبلغ</label><input name="amount" type="number" min="1" step="any" required></div>
      <div class="field"><label>التاريخ</label><input name="date" type="date" value="${todayStr()}" required></div>
      <div class="field"><label>ملاحظة</label><input name="note" placeholder="راتب / شغل إضافي…" maxlength="60"></div></div>
      <label class="check"><input type="checkbox" name="split" checked> قسّم تلقائيًا حسب النسب (الادخار يروح التحويش فورًا)</label>
      <button class="btn primary block" type="submit">حفظ الدخل</button><p class="hint" data-split-info></p></form></details>

    <details class="formbox"><summary>➖ إضافة مصروف</summary>
      <form data-form="expense"><div class="row">
      <div class="field"><label>المبلغ</label><input name="amount" type="number" min="1" step="any" required></div>
      <div class="field"><label>التصنيف</label><select name="cat">${Object.entries(S().CATS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div class="field"><label>التاريخ</label><input name="date" type="date" value="${todayStr()}" required></div>
      <div class="field"><label>ملاحظة</label><input name="note" placeholder="ليه؟" maxlength="60"></div></div>
      <button class="btn block" type="submit">حفظ المصروف</button></form></details>

    <details class="formbox"><summary>🐖 إيداع في التحويش</summary>
      <form data-form="saving"><div class="row">
      <div class="field"><label>المبلغ</label><input name="amount" type="number" min="1" step="any" required></div>
      <div class="field"><label>التاريخ</label><input name="date" type="date" value="${todayStr()}" required></div>
      <div class="field"><label>ملاحظة</label><input name="note" placeholder="تحويش…" maxlength="60"></div>
      <div class="field"><label>موجّه لهدف؟ (اختياري)</label><select name="goal"><option value="">— بدون هدف —</option>${goalOpts}</select></div></div>
      <button class="btn gold block" type="submit">إيداع في التحويش</button></form></details>

    <details class="formbox"><summary>⚙️ ميزانية الخروجات الشهرية</summary>
      <form data-form="budget"><div class="row">
      <div class="field"><label>سقف الخروجات الشهري (${cur()})</label><input name="outings" type="number" min="0" step="any" value="${st.settings.budgets.outings || ''}" placeholder="0 = غير محددة"></div>
      <div class="field"><label>حد المصروف الكبير (${cur()})</label><input name="big" type="number" min="0" step="any" value="${st.settings.bigExpense}"></div></div>
      <button class="btn sm" type="submit">💾 حفظ</button></form></details>

    <h2 class="sec-title">📊 أين تذهب أموالي هذا الشهر؟</h2>
    ${catChart(mo.from, mo.to)}
    <h2 class="sec-title">🧾 سجل الحركات (بالترتيب)</h2>
    ${txDesc.length ? '<ul class="list">' + txDesc.map(t =>
      `<li><span>${badge(t)} <strong>${t.type === 'income' ? '+' : t.type === 'saving' ? '🐖 ' : '−'}${(t.amount || 0).toLocaleString('en-US')}</strong> ${esc(S().CATS[t.cat] || '')} ${esc(t.note || '')}<div class="meta">${t.date}</div></span><button class="del" data-act="del-tx" data-id="${t.id}">🗑</button></li>`).join('') + '</ul>'
      : emptyList('لسه مفيش حركات. ابدأ بإضافة دخل أو مصروف.')}</ul>`;
  }

  /* ========== صفحة: شغلي ========== */
  function vWork() {
    const st = S().state, t = todayStr();
    const today = st.work.filter(w => w.date === t);
    const th = today.reduce((a, w) => a + (w.hours || 0), 0);
    const tt = S().workTotals(today);
    const wk = S().weekRange(0), pw = S().weekRange(-1);
    const cw = S().workTotals(S().workInRange(wk.from, wk.to)), ct = S().workTotals(S().workInRange(pw.from, pw.to));
    const tier = (h, label) => `<div class="tier ${th >= h ? 'done' : ''}"><span>${th >= h ? '✅' : '⬜'} ${label}</span><span class="small">${h} ساعات</span></div>`;
    const list = [...st.work].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
    return `
    <h2 class="page-title">🛵 شغلي وطلبات<small>طلبات Talabat — من غير إرهاق. الألم إشارة للتوقف، مش للتحمّل.</small></h2>
    <div class="grid c3">
      <div class="card stat"><h3>صافي اليوم</h3><span class="val">${fmt(tt.net)}</span></div>
      <div class="card stat"><h3>طلبات اليوم</h3><span class="val">${tt.orders || 0}</span></div>
      <div class="card stat blue"><h3>ساعات اليوم</h3><span class="val">${th || 0} س</span></div>
    </div>
    <h2 class="sec-title">🎯 أهداف تدريجية (بدون ضغط)</h2>
    ${tier(2, 'الهدف الأول — خفّف وابدأ')}${tier(4, 'الهدف الثاني')}${tier(6, 'الهدف الثالث — الحد الأقصى الصحي')}
    <div class="alert info">💡 الهدف هو الاستمرارية مش عدد الساعات. لو تعبت، وقّف. الصحة قبل أي بونص.</div>
    ${th >= 7 ? '<div class="alert warn">🛑 عدّى من 6 ساعات النهارده — وقّف هنا. باقي الأيام تعتمد على صحتك مش على زحمة اليوم ده.</div>' : ''}

    <details class="formbox" open><summary>➕ تسجيل يوم عمل (أو تحديثه)</summary>
      <form data-form="work"><input type="hidden" name="wid">
      <div class="row">
      <div class="field"><label>التاريخ</label><input name="date" type="date" value="${t}" required></div>
      <div class="field"><label>عدد الطلبات</label><input name="orders" type="number" min="0" step="1" value="0" required></div>
      <div class="field"><label>سعر الطلب الواحد</label><input name="price" type="number" min="0" step="any" value="0" required></div>
      <div class="field"><label>البونص</label><input name="bonus" type="number" min="0" step="any" value="0"></div>
      <div class="field"><label>الإكراميات</label><input name="tips" type="number" min="0" step="any" value="0"></div>
      <div class="field"><label>مصاريف الشغل (بنزين/أكل)</label><input name="expense" type="number" min="0" step="any" value="0"></div>
      <div class="field"><label>ساعات العمل</label><input name="hours" type="number" min="0" max="24" step="any" value="0"></div></div>
      <button class="btn primary block" type="submit">💾 حفظ اليوم</button></form></details>

    <h2 class="sec-title">⚖️ مقارنة: هذا الأسبوع × الأسبوع الماضي</h2>
    <div class="grid c2">
      <div class="card stat"><h3>صافي هذا الأسبوع</h3><span class="val">${fmt(cw.net)}</span><span class="sub">${cw.orders} طلبًا · ${cw.hours} ساعة</span></div>
      <div class="card stat"><h3>صافي الأسبوع الماضي</h3><span class="val">${fmt(ct.net)}</span><span class="sub">${ct.orders} طلبًا · ${ct.hours} ساعة</span></div>
    </div>
    <div class="chart">${Array.from({ length: 7 }, (_, i) => S().addDays(S().today(), i - 6)).map(d => {
      const net = S().workInRange(d, d).reduce((a, w) => a + S().workNet(w), 0);
      const max = Math.max(1, ...Array.from({ length: 7 }, (_, j) => S().workInRange(S().addDays(S().today(), j - 6), S().addDays(S().today(), j - 6)).reduce((a, w) => a + S().workNet(w), 0)));
      return `<div class="row"><span>${d.slice(5)}</span><div class="track"><i style="width:${Math.round(net / max * 100)}%"></i></div><span class="amount">${net || '—'}</span></div>`;
    }).join('')}</div>

    <h2 class="sec-title">📋 سجل الأيام</h2>
    ${list.length ? '<ul class="list">' + list.map(w =>
      `<li><span><strong>${w.date}</strong> — ${w.orders} طلبًا (${w.price} للطلب)<div class="meta">صافي ${fmt(S().workNet(w))} · ${w.hours} س · بونص ${w.bonus || 0} · إكراميات ${w.tips || 0} · مصاريف ${w.expense || 0}</div></span>
      <span><button class="del" data-act="edit-work" data-id="${w.id}">✏️</button><button class="del" data-act="del-work" data-id="${w.id}">🗑</button></span></li>`).join('') + '</ul>'
      : emptyList('لا أيام مسجّلة بعد.')}`;
  }

  /* ========== صفحة: حدودي ========== */
  function vBoundaries() {
    const st = S().state;
    const yn = (k, label) => `<div class="field"><label>${label}</label><select name="${k}"><option value="">—</option><option value="yes">أيوه</option><option value="no">لأ</option></select></div>`;
    return `
    <h2 class="page-title">🛡️ حدودي تحميني<small>ملاحظة مواقفك بهدوء — من غير حكم على حد، ومن غير افتراض نوايا.</small></h2>
    <div class="note-card"><h3>تذكير لنفسي</h3>
    <p>الحب لا يعني الاستدانة، ولا إهمال النفس، ولا كسر الخطة المالية من أجل خروجة. حدودي مش قسوة — حدودي أمان.</p></div>
    <details class="formbox" open><summary>📝 تسجيل موقف سبّب ضغطًا</summary>
      <form data-form="boundary">
      <div class="row">
      <div class="field"><label>التاريخ</label><input name="date" type="date" value="${todayStr()}"></div>
      <div class="field" style="min-width:220px"><label>إيه اللي حصل؟</label><input name="text" required maxlength="200" placeholder="صِف الموقف بهدوء…"></div></div>
      ${yn('cantAfford', 'هل وافقت على مصروف لا تستطيع تحمله؟')}
      ${yn('newInstallment', 'هل دخلت في قسط جديد بسبب شخص آخر؟')}
      ${yn('cancelledWork', 'هل ألغيت شغلك من أجل خروجة؟')}
      <button class="btn primary block" type="submit">💾 حفظ الموقف</button></form></details>
    ${st.boundaries.length ? '<ul class="list">' + [...st.boundaries].reverse().map(b =>
      `<li><span>${esc(b.text)}<div class="meta">${b.date}${b.cantAfford === 'yes' ? ' · <span class="badge red">مصروف فوق طاقتي</span>' : ''}${b.newInstallment === 'yes' ? ' · <span class="badge red">قسط جديد</span>' : ''}${b.cancelledWork === 'yes' ? ' · <span class="badge gold">ألغيت شغلًا</span>' : ''}</div></span><button class="del" data-act="del-boundary" data-id="${b.id}">🗑</button></li>`).join('') + '</ul>' : emptyList('لا مواقف مسجّلة. سجّل أول موقف بهدوء.')}
    <h2 class="sec-title">🚧 حدود المصروف والهدايا</h2>
    <div class="card"><form data-form="limits"><div class="row">
      <div class="field"><label>سقف مصروف الشهر (${cur()})</label><input name="spend" type="number" min="0" step="any" value="${st.settings.limits.spend || ''}"></div>
      <div class="field"><label>سقف الهدايا والمساعدات الشهرية (${cur()})</label><input name="gift" type="number" min="0" step="any" value="${st.settings.limits.gift || ''}"></div></div>
      <button class="btn sm" type="submit">💾 حفظ حدودي</button></form></div>
    <h2 class="sec-title">🔒 مساحة خاصة — أفكاري (لا تُرسل لأي شخص)</h2>
    <div class="card"><textarea data-notes placeholder="اكتب أفكارك هنا… محفوظة على جهازك فقط.">${esc(st.notes)}</textarea>
    <p class="hint" style="margin-top:6px">تُحفظ تلقائيًا على جهازك. لا تُرفع لأي خادم.</p></div>`;
  }

  /* ========== صفحة: أهداف ========== */
  function vGoals() {
    const st = S().state, go = S().goalsOverall();
    return `
    <h2 class="page-title">🎯 أهداف المستقبل<small>أهداف قابلة للقياس — مبلغ مستهدف ومحفوظ وموعد اختياري.</small></h2>
    ${go !== null ? `<div class="card stat gold" style="margin-bottom:12px"><h3>التقدّم العام</h3><span class="val">${go}%</span>${bar(go, 'gold')}</div>` : ''}
    <details class="formbox" open><summary>➕ هدف جديد</summary>
      <form data-form="goal"><div class="row">
      <div class="field"><label>الهدف</label><select name="preset">${GOAL_PRESETS.map(g => `<option>${g}</option>`).join('')}<option value="custom">هدف آخر…</option></select></div>
      <div class="field"><label>اسم مخصص (لو اخترت آخر)</label><input name="customName" maxlength="60"></div>
      <div class="field"><label>المبلغ المستهدف (${cur()})</label><input name="target" type="number" min="1" step="any" required></div>
      <div class="field"><label>موعد مستهدف (اختياري)</label><input name="deadline" type="date"></div></div>
      <button class="btn primary block" type="submit">💾 إضافة الهدف</button></form></details>
    ${st.goals.length ? st.goals.map(g => {
      const p = S().goalProgress(g);
      return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center"><strong>${esc(g.name)}</strong>
      <span><span class="badge ${p.pct >= 100 ? 'green' : 'gold'}">${p.pct}%</span> <button class="del" data-act="del-goal" data-id="${g.id}">🗑</button></span></div>
      ${bar(p.pct, p.pct >= 100 ? '' : 'gold')}
      <p class="hint" style="margin-top:6px">حفظت ${fmt(p.saved)} من ${fmt(g.target)}${g.deadline ? ' · الموعد: ' + g.deadline : ''}</p>
      <form data-form="goal-deposit" data-goal="${g.id}" style="display:flex;gap:8px;margin-top:8px">
      <input name="amount" type="number" min="1" step="any" placeholder="مبلغ إضافي…" required style="flex:1">
      <button class="btn gold sm" type="submit">🐖 أضف للهدف</button></form></div>`;
    }).join('') : emptyList('لسه مفيش أهداف. ابدأ بأول هدف — صندوق طوارئ صغير مثلًا.')}`;
  }

  /* ========== صفحة: تحديات ========== */
  function vChallenges() {
    const st = S().state;
    return `
    <h2 class="page-title">🔥 نظام التحديات<small>ابدأ، توقف، أو أعِد المحاولة — من غير عقاب ومن غير لوم.</small></h2>
    ${S().CHALLENGES.map(def => {
      const c = st.challenges[def.id], p = S().challengeProgress(def);
      const status = !c ? ['muted', 'لم يبدأ'] : c.status === 'stopped' ? ['red', 'متوقف'] : p && p.done ? ['green', '🏆 أتممته!'] : p && p.broken ? ['red', 'انقطع — عيد من جديد بهدوء'] : ['gold', 'نشط'];
      const pct = p ? Math.round(p.ok / def.days * 100) : 0;
      const btns = !c || c.status === 'stopped'
        ? `<button class="btn primary sm" data-act="ch-start" data-id="${def.id}">ابدأ التحدي</button>`
        : c.status === 'active'
          ? `<button class="btn sm" data-act="ch-stop" data-id="${def.id}">إيقاف</button> <button class="btn sm" data-act="ch-retry" data-id="${def.id}">إعادة من جديد</button>`
          : `<button class="btn primary sm" data-act="ch-retry" data-id="${def.id}">حاول تاني</button>`;
      return `<div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center"><strong>${esc(def.name)}</strong><span class="badge ${status[0]}">${status[1]}</span></div>
      <p class="small">${esc(def.desc)}</p>
      ${p && c.status === 'active' ? bar(pct, p.done ? '' : 'gold') + `<p class="bar-label"><span>أنجزت ${p.ok} من ${def.days} يومًا</span><span>بدأ ${c.start}</span></p>` : ''}
      <div class="mt">${btns}</div></div>`;
    }).join('')}`;
  }

  /* ========== صفحة: تقارير ========== */
  function vReports() {
    const isW = reportMode === 'week';
    const r = isW ? S().weekRange(0) : S().monthRange(0);
    const pr = S().projection();
    const inc = S().income(r.from, r.to), exp = S().expenses(r.from, r.to), sav = S().savedBetween(r.from, r.to);
    const moods = Object.entries(S().state.daily).filter(([d, x]) => d >= r.from && d <= r.to && x.mood > 0).map(([, x]) => x.mood);
    const avgMood = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : '—';
    const w = S().workTotals(S().workInRange(r.from, r.to));
    const projRow = (label, o) => `<li><span>${label}</span><span>${o ? `<span class="badge red">متحفظ ${fmt(o.conservative)}</span> <span class="badge gold">متوسط ${fmt(o.medium)}</span> <span class="badge green">متفائل ${fmt(o.optimistic)}</span>` : '—'}</span></li>`;
    return `
    <h2 class="page-title">📊 التقارير<small>بناءً على أرقامك المسجّلة فقط — لا أرقام وهمية.</small></h2>
    <div class="tabs">
      <button class="btn sm ${isW ? 'active' : ''}" data-act="rep-mode" data-mode="week">أسبوعي</button>
      <button class="btn sm ${isW ? '' : 'active'}" data-act="rep-mode" data-mode="month">شهري</button>
      <span class="hint" style="align-self:center">${r.from} ← ${r.to}</span>
    </div>
    <div class="grid c3">
      <div class="card stat"><h3>الدخل</h3><span class="val" style="font-size:1.1rem">${fmt(inc)}</span></div>
      <div class="card stat"><h3>المصروف</h3><span class="val" style="font-size:1.1rem">${fmt(exp)}</span></div>
      <div class="card stat gold"><h3>التحويش</h3><span class="val" style="font-size:1.1rem">${fmt(sav)}</span></div>
      <div class="card stat"><h3>الصافي</h3><span class="val" style="font-size:1.1rem">${fmt(inc - exp - sav)}</span></div>
      <div class="card stat blue"><h3>صافي الشغل</h3><span class="val" style="font-size:1.1rem">${fmt(w.net)}</span><span class="sub">${w.orders} طلبًا · ${w.hours} ساعة</span></div>
      <div class="card stat green"><h3>متوسط المزاج</h3><span class="val" style="font-size:1.1rem">${avgMood}</span><span class="sub">من 10</span></div>
    </div>
    <h2 class="sec-title">أين تذهب أموالي؟</h2>${catChart(r.from, r.to)}
    <h2 class="sec-title">🔮 محاكي التحويش — توقعك بناءً على أرقامك</h2>
    <div class="alert info">المحاكاة مبنية على متوسط تحويشك الفعلي آخر 30 يومًا (${pr.basedOnActual ? 'مسجّل فعليًا: ' + fmt(pr.saved30) : 'لا تحويش فعلي بعد — مبنية على دخل آخر 30 يومًا ' + fmt(pr.income30) + ' × نسبة الادخار ' + S().state.settings.splits.save + '%'}).
    متوسطك الشهري: <strong>${fmt(pr.monthly)}</strong></div>
    <ul class="list">
      ${projRow('بعد شهر', pr.m1)}${projRow('بعد 3 أشهر', pr.m3)}${projRow('بعد 6 أشهر', pr.m6)}${projRow('بعد سنة', pr.m12)}
    </ul>
    <p class="hint" style="margin-top:8px">متحفظ = نصف متوسطك · متوسط = متوسطك · متفائل = ×1.5. ليست وعودًا — مجرد بوصلة.</p>`;
  }

  /* ========== صفحة: إعدادات ========== */
  function vSettings() {
    const st = S().state, s = st.settings;
    const notif = window.Notification ? Notification.permission : 'unsupported';
    return `
    <h2 class="page-title">⚙️ الإعدادات<small>بياناتك على جهازك فقط — لا تُرسل لأي خادم.</small></h2>
    <div class="card" style="margin-bottom:12px"><form data-form="currency"><div class="row">
      <div class="field"><label>العملة</label><input name="currency" value="${esc(s.currency)}" maxlength="8" required></div>
      <div class="field" style="align-self:end"><button class="btn sm" type="submit">💾 حفظ</button></div></div></form></div>
    <details class="formbox" open><summary>⚖️ نسب تقسيم الدخل (المجموع 100%)</summary>
      <form data-form="splits"><div class="row">
      <div class="field"><label>ادخار وديون %</label><input name="save" type="number" min="0" max="100" value="${s.splits.save}"></div>
      <div class="field"><label>احتياجات أساسية %</label><input name="needs" type="number" min="0" max="100" value="${s.splits.needs}"></div>
      <div class="field"><label>التزامات شخصية %</label><input name="commitments" type="number" min="0" max="100" value="${s.splits.commitments}"></div>
      <div class="field"><label>ترفيه وخروجات %</label><input name="fun" type="number" min="0" max="100" value="${s.splits.fun}"></div></div>
      <button class="btn sm" type="submit">💾 حفظ النسب</button></form></details>
    <h2 class="sec-title">🔒 حماية PIN (اختياري)</h2>
    <div class="card">
      <p class="hint">${s.pin ? 'PIN مفعّل — الشاشة تُقفل عند إعادة الفتح.' : 'لا يوجد PIN. فعّله لو جهازك مشتركًا.'} حماية للعرض، مش تشفيرًا كاملًا.</p>
      <form data-form="pin" style="display:flex;gap:8px;margin-top:8px">
      <input name="pin" type="password" inputmode="numeric" placeholder="${s.pin ? 'PIN جديد…' : 'PIN جديد…'}" required style="flex:1">
      <button class="btn sm" type="submit">${s.pin ? 'تغيير' : 'تفعيل'}</button></form>
      ${s.pin ? '<button class="btn danger sm mt" data-act="pin-clear">إلغاء PIN</button>' : ''}</div>
    <h2 class="sec-title">🎨 المظهر</h2>
    <div class="card">
      <label class="check"><input type="checkbox" data-rain-toggle ${st.settings.rain !== false ? 'checked' : ''}> خلفية «المطر الرقمي» الحية</label>
      <p class="hint">${weakDevice ? 'مقفولة تلقائيًا على جهازك للحفاظ على السرعة (جهاز ضعيف). ' : ''}لو ظهرت شاشة سوداء أو بطارية بتنضج — اقفلها. الموقع يشتغل كامل حتى بغيرها.</p>
      <p class="hint">أقفلها على جهاز قديم أو بطارية ضعيفة — الموقع يشتغل كامل حتى بغيرها.</p>
    </div>
    <h2 class="sec-title">🔔 التنبيهات</h2>    <div class="card">
      <p class="hint">الحالة: ${notif === 'granted' ? 'مفعّلة ✅' : notif === 'denied' ? 'مرفوضة — فعّلها من إعدادات المتصفح' : 'غير مفعّلة'}.
      تذكير يومي عند فتح التطبيق: سجّل مصروفاتك ودخل الطلبات.</p>
      <button class="btn sm mt" data-act="notif">🔔 تفعيل التنبيهات</button></div>
    <h2 class="sec-title">📱 التثبيت</h2>
    <div class="card"><p class="hint">ثبّت التطبيق على شاشة أندرويد للوصول السريع والعمل دون إنترنت.</p>
      <button class="btn sm mt" data-act="install" id="installBtn" hidden>📲 تثبيت التطبيق</button>
      <p class="hint mt" id="installHint">لو الزر مخفي: من قائمة المتصفح اختر "إضافة إلى الشاشة الرئيسية".</p></div>
    <h2 class="sec-title">🧠 الذكاء الاصطناعي (اختياري)</h2>
    <div class="card">
      <p class="hint">${s.aiKey ? 'المفتاح مُخزَّن على جهازك بس ✅ — شات «عقل الموقع» مفعّل. ولا شى كتابتك في ملف التصدير.' : 'لوّص مفتاح OpenRouter للشات الحي مع العقل. المفتاح يبقى على جهازك فقط، ولا تُصدَّر مع النسخ الاحتياطية.'}</p>
      <form data-form="aikey" style="display:flex;gap:8px;margin-top:8px">
        <input name="aiKey" type="password" placeholder="${s.aiKey ? 'مفتاح جديد…' : 'sk-or-v1-…'}" style="flex:1">
        <button class="btn sm" type="submit">${s.aiKey ? 'تغيير' : 'تخزين'}</button>
      </form>
      ${s.aiKey ? '<button class="btn danger sm mt" data-act="aikey-clear">مسح المفتاح</button>' : ''}
      ${s.aiKey ? '<p class="hint mt">كلام الشات بيوصل لخدمة OpenRouter للإجابة — باقي البيانات واقفة عندك.</p>' : ''}
    </div>
    <h2 class="sec-title">💾 النسخ الاحتياطي</h2>
    <details class="formbox"><summary>تصدير البيانات (JSON)</summary>
      <button class="btn sm" data-act="export">⬇️ تنزيل نسخة احتياطية</button>
      <textarea id="exportBox" readonly style="margin-top:8px;height:120px" placeholder="النسخة ستظهر هنا…"></textarea></details>
    <details class="formbox"><summary>استيراد البيانات</summary>
      <textarea id="importBox" placeholder="الصق محتوى ملف النسخة الاحتياطية هنا…" style="height:120px"></textarea>
      <button class="btn sm mt" data-act="import">📥 استيراد (يستبدل الحالي)</button></details>
    <h2 class="sec-title">🗑 منطقة الخطر</h2>
    <div class="card"><button class="btn danger block" data-act="reset">مسح كل البيانات والبدء من جديد</button></div>
    <div class="note-card mt"><h3>عن راجع لنفسي</h3>
    <p>أداة شخصية لاستعادة التوازن النفسي والمالي والعملي. كل بياناتك في LocalStorage على جهازك — لا حساب، لا خادم، لا تتبّع. صدّر نسخة احتياطية بانتظام.</p></div>`;
  }

  const VIEWS = { home: vHome, mind: vMind, money: vMoney, work: vWork, boundaries: vBoundaries, goals: vGoals, challenges: vChallenges, reports: vReports, settings: vSettings, advice: vAdvice };

  function wireLabels() {
    // ربط كل label بحقلها تلقائياً (a11y) — أرخص من إعادة هيكل كل نموذج بيدويًا
    $('#view').querySelectorAll('.field').forEach(f => {
      const lbl = f.querySelector('label'), ctl = f.querySelector('input,select,textarea');
      if (lbl && ctl && !ctl.id) {
        ctl.id = 'f-' + Math.random().toString(36).slice(2, 8);
        lbl.htmlFor = ctl.id;
      }
    });
  }

  function render() {
    const hash = location.hash.replace('#/', '') || 'home';
    const route = ROUTES.includes(hash) ? hash : 'home';
    const y = window.scrollY;
    $('#view').innerHTML = VIEWS[route]();
    $$('[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === route));
    const moreIn = ['boundaries', 'goals', 'challenges', 'reports', 'settings', 'advice'].includes(route);
    $('#moreBtn').classList.toggle('sheet-open', moreIn);
    closeSheet();
    window.scrollTo(0, y);
    requestAnimationFrame(() => window.scrollTo(0, y));
    wireLabels();
  }

  /* ورقة «المزيد» */
  function closeSheet() { const s = $('#moreSheet'); if (s) s.hidden = true; }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-act="more"]')) { $('#moreSheet').hidden = false; return; }
    if (e.target.closest('[data-act="more-close"]')) closeSheet();
  });
  window.addEventListener('hashchange', render);

  /* ===== أحداث عامة ===== */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, st = S().state;
    if (act === 'lock') { sessionStorage.removeItem('raj3_unlocked'); showLock(); }
    else if (act === 'start-day') { mindDate = todayStr(); location.hash = '#/mind'; toast('أهلًا بيومك الجديد 🌅 سجّل حالتك ومزاجك'); }
    else if (act === 'mind-prev') { mindDate = S().addDays(mindDate, -1); render(); }
    else if (act === 'mind-next') { if (mindDate < todayStr()) { mindDate = S().addDays(mindDate, 1); render(); } }
    else if (act === 'mind-del') { const r = dailyRec(mindDate); r[b.dataset.key].splice(+b.dataset.i, 1); S().save(); render(); }
    else if (act === 'del-tx') {
      const tx = st.tx.find(x => x.id === b.dataset.id);
      if (tx && tx.ref.startsWith('work:')) { S().delWork(tx.ref.slice(5)); toast('حُذف يوم العمل ودخله'); }
      else { S().delTx(b.dataset.id); toast('حُذفت الحركة'); }
      render();
    }
    else if (act === 'del-work') { S().delWork(b.dataset.id); toast('حُذف يوم العمل'); render(); }
    else if (act === 'edit-work') {
      const w = st.work.find(x => x.id === b.dataset.id); if (!w) return;
      const f = document.querySelector('[data-form="work"]');
      if (f) { const el = k => f.elements.namedItem(k); el('wid').value = w.id; el('date').value = w.date; el('orders').value = w.orders; el('price').value = w.price; el('bonus').value = w.bonus || 0; el('tips').value = w.tips || 0; el('expense').value = w.expense || 0; el('hours').value = w.hours || 0; f.closest('details').open = true; f.scrollIntoView({ behavior: 'smooth' }); toast('تعديل يوم ' + w.date); }
    }
    else if (act === 'del-boundary') { st.boundaries = st.boundaries.filter(x => x.id !== b.dataset.id); S().save(); toast('حُذف الموقف'); render(); }
    else if (act === 'del-goal') { if (confirm('حذف الهدف؟ (التحويش المرتبط به يبقى في المحفظة)')) { st.goals = st.goals.filter(x => x.id !== b.dataset.id); S().save(); toast('حُذف الهدف'); render(); } }
    else if (act === 'ch-start') { S().startChallenge(b.dataset.id); toast('بدأ التحدي — خطوة صغيرة كل يوم 💪'); render(); }
    else if (act === 'ch-stop') { S().stopChallenge(b.dataset.id); toast('توقف التحدي. لا لوم — استراحتك مهمة.'); render(); }
    else if (act === 'ch-retry') { S().retryChallenge(b.dataset.id); toast('محاولة جديدة من غير عقاب ✨'); render(); }
    else if (act === 'rep-mode') { reportMode = b.dataset.mode; render(); }
    else if (act === 'pin-clear') { if (confirm('إلغاء PIN؟')) { S().clearPin(); toast('أُلغي PIN'); render(); } }
    else if (act === 'aikey-clear') { if (confirm('مسح مفتاح الذكاء الاصطناعي؟ الشات الحي هيقفل.')) { st.settings.aiKey = ''; S().save(); toast('مسيحات المفتاح'); render(); } }
    else if (act === 'notif') {
      if (window.Notification) Notification.requestPermission().then(p => { toast(p === 'granted' ? 'التنبيهات مفعّلة 🔔' : 'رفضت التنبيهات — لا بأس، تنبيهات التطبيق الداخلية موجودة'); render(); });
      else toast('المتصفح لا يدعم التنبيهات — استخدم تنبيهات التطبيق الداخلية');
    }
    else if (act === 'install') { if (window._deferredPrompt) { window._deferredPrompt.prompt(); window._deferredPrompt.userChoice.then(() => { window._deferredPrompt = null; $('#installBtn').hidden = true; }); } }
    else if (act === 'export') {
      const json = S().exportJSON(); $('#exportBox').value = json;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = 'raj3-nafsi-backup-' + todayStr() + '.json'; a.click(); URL.revokeObjectURL(a.href);
      toast('نُزّلت النسخة الاحتياطية 💾');
    }
    else if (act === 'import') {
      const txt = $('#importBox').value.trim(); if (!txt) return toast('الصق محتوى النسخة أولًا');
      if (!confirm('الاستيراد سيستبدل كل بياناتك الحالية. متأكد؟')) return;
      try { S().importJSON(txt); toast('استُوردت البيانات بنجاح ✅'); render(); }
      catch (err) { toast('ملف غير صالح: ' + err.message); }
    }
    else if (act === 'reset') { if (confirm('مسح كل البيانات نهائيًا؟') && confirm('آخر فرصة… هتمسح كل شيء فعلًا.')) { S().resetAll(); toast('بداية جديدة ✨'); render(); } }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.mind) { const r = dailyRec(mindDate); const k = el.dataset.mind;
      r[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
      S().save(); if (el.type === 'range') el.nextElementSibling.textContent = el.value; }
    if (el.dataset.task !== undefined || el.dataset.task) { const r = dailyRec(mindDate); r.tasks[el.dataset.task] = el.checked; S().save(); }
    if (el.dataset.notes !== undefined) { S().state.notes = el.value; S().save(); }
    if (el.type === 'file' && el.id === 'importFile') { const fr = new FileReader(); fr.onload = () => { $('#importBox').value = fr.result; }; fr.readAsText(el.files[0]); }
    if (el.dataset.rainToggle !== undefined) {
      S().state.settings.rain = el.checked; S().save();
      if (el.checked && !window._rain) window._rain = startRain();
      else if (!el.checked && window._rain) { window._rain.destroy(); window._rain = null; }
    }
  });
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.mind === 'diary') { dailyRec(mindDate).diary = el.value; S().save(); }
    if (el.dataset.notes !== undefined) { S().state.notes = el.value; S().save(); }
    if (el.type === 'range' && el.nextElementSibling) el.nextElementSibling.textContent = el.value;
  });

  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, fd = new FormData(f), st = S().state;
    const n = k => parseFloat(fd.get(k)) || 0;
    if (f.dataset.form === 'income') {
      const amount = n('amount'); if (amount <= 0) return toast('أدخل مبلغًا صحيحًا');
      const r = S().addIncome(amount, String(fd.get('date')) || todayStr(), String(fd.get('note') || ''), !!fd.get('split'));
      toast(r.result.saved ? `انقسم: ${S().state.settings.splits.save}% تحويش (${Math.round(r.result.saved)} ${cur()})` : 'حُفظ الدخل');
      render();
    }
    else if (f.dataset.form === 'expense') {
      const amount = n('amount'), cat = String(fd.get('cat'));
      if (amount <= 0) return toast('أدخل مبلغًا صحيحًا');
      if (amount >= st.settings.bigExpense && !confirm(`مصروف كبير (${fmt(amount)}). متأكد؟`)) return;
      if (cat === 'outings' && st.settings.budgets.outings > 0) {
        const mo = S().monthRange(0);
        if (S().spentInGroup('fun', mo.from, mo.to) + amount > st.settings.budgets.outings && !confirm('هتتجاوز ميزانية الخروجات. أكمل؟')) return;
      }
      S().addTx({ type: 'expense', amount, cat, date: String(fd.get('date')) || todayStr(), note: String(fd.get('note') || '') });
      toast('حُفظ المصروف'); render();
    }
    else if (f.dataset.form === 'saving') {
      const amount = n('amount'); if (amount <= 0) return toast('أدخل مبلغًا صحيحًا');
      const goal = String(fd.get('goal') || '');
      if (amount > S().available() && !confirm('المبلغ أكبر من رصيدك المتاح. تكمل برضه؟')) return;
      S().depositSaving(amount, String(fd.get('date')) || todayStr(), String(fd.get('note') || '') || 'تحويش', goal);
      toast('أودعت في التحويش 🐖'); render();
    }
    else if (f.dataset.form === 'budget') { st.settings.budgets.outings = n('outings'); st.settings.bigExpense = n('big') || st.settings.bigExpense; S().save(); toast('حُفظت الميزانية'); render(); }
    else if (f.dataset.form === 'work') {
      const entry = { id: String(fd.get('wid') || ''), date: String(fd.get('date')), orders: n('orders'), price: n('price'), bonus: n('bonus'), tips: n('tips'), expense: n('expense'), hours: n('hours') };
      const saved = S().saveWork(entry);
      toast('حُفظ اليوم — الصافي ' + fmt(S().workNet(saved))); render();
    }
    else if (f.dataset.form === 'boundary') {
      st.boundaries.push({ id: S().uid(), date: String(fd.get('date')) || todayStr(), text: String(fd.get('text')), cantAfford: String(fd.get('cantAfford') || ''), newInstallment: String(fd.get('newInstallment') || ''), cancelledWork: String(fd.get('cancelledWork') || '') });
      S().save(); toast('حُفظ الموقف. الوعي أول خطوة 🛡️'); render();
    }
    else if (f.dataset.form === 'limits') { st.settings.limits.spend = n('spend'); st.settings.limits.gift = n('gift'); S().save(); toast('حُفظت حدودك'); render(); }
    else if (f.dataset.form === 'goal') {
      const preset = String(fd.get('preset'));
      const name = preset === 'custom' ? String(fd.get('customName') || '').trim() : preset;
      if (!name) return toast('اكتب اسم الهدف');
      st.goals.push({ id: S().uid(), name, target: n('target'), deadline: String(fd.get('deadline') || ''), created: todayStr() });
      S().save(); toast('أُضيف الهدف 🎯'); render();
    }
    else if (f.dataset.form === 'goal-deposit') {
      const amount = n('amount'); if (amount <= 0) return toast('أدخل مبلغًا');
      if (amount > S().available() && !confirm('أكبر من رصيدك المتاح. تكمل؟')) return;
      S().depositSaving(amount, todayStr(), 'لهدف', f.dataset.goal);
      toast('أُضيف للهدف 🐖'); render();
    }
    else if (f.dataset.form === 'currency') { st.settings.currency = String(fd.get('currency') || 'ج.م'); S().save(); toast('حُفظت العملة'); render(); }
    else if (f.dataset.form === 'splits') {
      const sum = n('save') + n('needs') + n('commitments') + n('fun');
      if (sum !== 100) return toast('النسب لازم مجموعها 100% (الحالي ' + sum + ')');
      Object.assign(st.settings.splits, { save: n('save'), needs: n('needs'), commitments: n('commitments'), fun: n('fun') });
      S().save(); toast('حُفظت النسب'); render();
    }
    else if (f.dataset.form === 'pin') { S().setPin(String(fd.get('pin')).trim()); toast('حُفظ PIN'); render(); }
    else if (f.dataset.form === 'aikey') { const k = String(fd.get('aiKey') || '').trim(); if (!k) return toast('حط المفتاح الأول'); st.settings.aiKey = k; S().save(); toast('المفتاح على جهازك ✅ — افتح عقل الموقع وكلمه'); render(); }
    else if (f.dataset.form === 'ai-chat') {
      const q = String(fd.get('q') || '').trim(); if (!q) return;
      aiChat.push({ role: 'user', text: q });
      const out = $('#aiChatOut'); if (out) out.innerHTML = chatHtml('<p class="empty">… العقل بيفكر</p>');
      aiCall(q).then(txt => { aiChat.push({ role: 'assistant', text: txt }); render(); })
        .catch(err => { toast('تعذر الرد: ' + err.message); render(); });
    }
    else if (f.dataset.form === 'goal-deposit') { /* أعلاه */ }
    else if (f.dataset.mini) {
      const txt = String(fd.get('txt') || '').trim(); if (!txt) return;
      dailyRec(mindDate)[f.dataset.mini].push(txt); S().save(); toast('أُضيف ✓'); render();
    }
    else if (f.dataset.taskform !== undefined) {
      const txt = String(fd.get('txt') || '').trim(); if (!txt) return;
      st.customTasks.push({ id: S().uid(), text: txt }); S().save(); toast('أُضيفت مهمة ✓'); render();
    }
  });

  /* ===== PIN ===== */
  function showLock() { $('#lockScreen').hidden = false; setTimeout(() => $('#pinInput').focus(), 50); }
  $('#formUnlock').addEventListener('submit', e => {
    e.preventDefault();
    if (S().checkPin($('#pinInput').value.trim())) {
      sessionStorage.setItem('raj3_unlocked', '1'); $('#lockScreen').hidden = true; $('#pinError').hidden = true;
      toast('أهلًا بعودتك 🌿'); render();
    } else { $('#pinError').hidden = false; $('#pinInput').value = ''; }
  });
  if (S().state.settings.pin && sessionStorage.getItem('raj3_unlocked') !== '1') showLock();

  /* ===== PWA ===== */
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._deferredPrompt = e; const b = $('#installBtn'); if (b) b.hidden = false; });
  // في standalone على أندرويد: new Notification محظور من الصفحة (Illegal constructor) — لذا هذا ناجذ
  if (window.Notification && Notification.permission === 'granted' && S().state.lastNotify !== todayStr()) {
    try {
      new Notification('راجع لنفسي 🌿', { body: 'سجّل مصروفات اليوم ودخل الطلبات — دقيقتان تكفيان.' });
      S().state.lastNotify = todayStr(); S().save();
    } catch (e) { /* التطبيق المثبت يرفضه — التنبيهات الداخلية تُغطي */ }
  }

  /* خلفية DataRain — المحتوى أولًا، الحركة بعده؛ أجهزة ضعيفة (≤3 أنوية) تتجاوزها تلقائيًا
     و?safe=1 = فتح بأمان من غير المطر لحالت التصميم في المتصفح الدُّجّ */
  function startRain() {
    try {
      const host = $('#rain');
      if (!host || typeof window.createDataRain !== 'function' ||
          typeof document.createElement('canvas').getContext !== 'function') return null;
      // الألوان تقرأ من متغيرات CSS (--dr-*) — أطفأ أو ضبطها من styles.css
      return window.createDataRain(host, { flowSpeed: 0.8, obstacleRadius: 60 });
    } catch (e) { return null; }
  }
  const weakDevice = (navigator.hardwareConcurrency || 8) <= 3;
  const safeBoot = /[?&]safe=1/.test(location.search);

  render();

  // المطر يبدأ بعد ما المحتوى يقعد على الشاشة — مش أصله
  requestAnimationFrame(() => setTimeout(() => {
    if (S().state.settings.rain !== false && !weakDevice && !safeBoot) window._rain = startRain();
  }, 300));
})();
