// The website version of the app's onboarding: the same questions, in the same order, without the photo.
// The routine is built by the app's own code (js/routine.js is bundled from iseul-lab/src/lib), so it matches
// what the app makes from the same answers. Nothing leaves the browser.

const APP_URL = 'https://apps.apple.com/app/id6833976294';
const PNTA = 'Prefer not to say';
const GOALS = [
  ['hydration', 'More comfortable, hydrated skin'],
  ['breakouts', 'Fewer breakouts'],
  ['tone', 'More even tone'],
  ['texture', 'Smoother texture'],
  ['redness', 'Less redness'],
  ['lines', 'Fine lines'],
  ['maintain', 'Keep things as they are'],
];
const CLIMATES = [['cold-dry', 'Cold, with dry air or heating on'], ['mild', 'Mild'], ['hot-humid', 'Hot and humid'], ['hot-dry', 'Hot and dry'], ['unknown', PNTA]];
const TRIGGERS = ['Fragrance', 'Essential oils', 'Alcohol', 'Sulfates', 'Lanolin'];
const PAGES = ['name', 'age', 'gender', 'skin', 'goals', 'climate', 'allergies', 'safety', 'effort'];

const EMPTY = { goals: [], afterCleansing: 'unknown', midday: 'unknown', sensitivity: 'unknown', allergies: '', reactions: '', conditions: [], medications: [], recentProcedure: 'unknown', pregnancy: 'unknown', owned: [], budget: 'unknown', routineLength: 'standard', country: 'US', preferences: [] };

const root = document.getElementById('quiz');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let R = null; // the app's routine code, loaded when the quiz starts
let images = {};
let p, step, ageText, ageChecked, answered;

function reset() {
  p = { ...EMPTY, goals: [] };
  step = 0;
  ageText = '';
  ageChecked = false;
  answered = { sensitivity: false, pregnancy: false, medication: false, effort: false };
}

async function start() {
  reset();
  root.innerHTML = '<p class="q-loading">Loading the questions…</p>';
  root.hidden = false;
  document.getElementById('quiz-intro').hidden = true;
  try {
    if (!R) {
      [R, images] = await Promise.all([import('./routine.js?v=20261116c'), fetch('js/product-images.json?v=20261116c').then((r) => r.json()).catch(() => ({}))]);
    }
  } catch {
    root.innerHTML = '<p class="q-loading">The questions could not load. Please refresh the page and try again.</p>';
    return;
  }
  render();
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- helpers that mirror the app's rules ----------
const age = () => (/^\d{1,3}$/.test(ageText) ? Number(ageText) : undefined);
const ageMissing = () => age() === undefined;
const ageInvalid = () => ageText !== '' && (age() === undefined || age() > 120);
const tooYoung = () => age() !== undefined && age() < R.MINIMUM_AGE;
const askPregnancy = () => p.gender !== 'man';
const triggers = () => p.allergies.split(',').map((t) => t.trim()).filter(Boolean);
const med = () => (p.medications.includes('isotretinoin') ? 'isotretinoin' : p.medications.includes('rx-retinoid') ? 'rx-retinoid' : p.medications.includes('none') ? 'none' : 'unknown');
const safetyOpen = () => !answered.sensitivity || !answered.medication || (askPregnancy() && !answered.pregnancy);
const effortOpen = () => !answered.effort;

function chips(name, options, selected, multi = false) {
  return `<div class="q-chips" role="${multi ? 'group' : 'radiogroup'}">${options
    .map(([id, label]) => {
      const on = multi ? selected.includes(id) : selected === id;
      return `<button type="button" class="q-chip${on ? ' on' : ''}" data-set="${name}" data-val="${esc(id)}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}">${esc(label)}</button>`;
    })
    .join('')}</div>`;
}

// ---------- pages ----------
function pageHtml(page) {
  if (page === 'name')
    return `<h3 class="q-title">What's your name?</h3>
      <label class="q-field"><span>First name</span><input id="q-name" type="text" autocomplete="given-name" placeholder="What should we call you?" value="${esc(p.name ?? '')}"></label>
      <p class="q-small">Used to greet you with your routine.</p>`;
  if (page === 'age') {
    const a = age();
    let msg = '';
    if (ageChecked && ageInvalid()) msg = '<p class="q-notice clay">Please enter your age as a number.</p>';
    else if (ageChecked && tooYoung()) msg = `<div class="q-notice clay"><strong>bom lab is for people aged ${R.MINIMUM_AGE} and over</strong><br>We cannot build a routine for you. A parent, guardian, pharmacist, or doctor is the best person to ask about your skin.</div>`;
    else if (ageChecked && a !== undefined && a < R.ADULT_AGE) msg = `<p class="q-notice">Because you are under ${R.ADULT_AGE}, your routine will be a gentle cleanser, a moisturizer, and sunscreen, with no active ingredients.</p>`;
    return `<h3 class="q-title">How old are you?</h3>
      <label class="q-field"><span>Age in years</span><input id="q-age" type="text" inputmode="numeric" placeholder="For example 29" value="${esc(ageText)}"></label>
      <p class="q-small">Why we ask: active ingredients are not recommended under ${R.ADULT_AGE}, so a younger age keeps the routine to the basics.</p>${msg}`;
  }
  if (page === 'gender')
    return `<h3 class="q-title">How do you describe your gender?</h3>
      ${chips('gender', [['woman', 'Woman'], ['man', 'Man'], ['nonbinary', 'Non-binary'], ['unknown', PNTA]], p.gender)}
      <p class="q-small">Why we ask: it only decides whether we ask about pregnancy later. It does not change your routine in any other way.</p>`;
  if (page === 'skin')
    return `<h3 class="q-title">How would you describe your skin?</h3>
      ${chips('selfSkinType', [['dry', 'Dry'], ['oily', 'Oily'], ['combination', 'Combination'], ['balanced', 'Balanced'], ['unsure', 'Not sure']], p.selfSkinType)}
      ${p.selfSkinType === 'unsure'
        ? `<h4 class="q-sub">About ten minutes after cleansing</h4>${chips('afterCleansing', [['tight', 'Tight or dry'], ['comfortable', 'Comfortable'], ['oily', 'Already a little oily'], ['unknown', 'Not sure']], p.afterCleansing)}
           <h4 class="q-sub">By the middle of the day</h4>${chips('midday', [['dry', 'Dry or tight'], ['balanced', 'Comfortable'], ['tzone', 'Oily on forehead and nose only'], ['oily', 'Oily all over'], ['unknown', 'Not sure']], p.midday)}`
        : ''}
      <p class="q-small">Skin type here is your own description.</p>`;
  if (page === 'goals')
    return `<h3 class="q-title">What matters most to you?</h3>
      <p class="q-lead">Choose as many as you like. The first is treated as the priority.</p>
      ${chips('goals', GOALS, p.goals, true)}`;
  if (page === 'climate')
    return `<h3 class="q-title">What is the weather like where you live right now?</h3>
      ${chips('climate', CLIMATES, p.climate)}
      <p class="q-small">Why we ask: cold, dry air and heating dry skin out, and heat and humidity make it oilier. That changes which textures suit you.</p>`;
  if (page === 'allergies') {
    const t = triggers().map((x) => x.toLowerCase());
    return `<h3 class="q-title">Is there anything your skin reacts to?</h3>
      <p class="q-lead">Choose any that apply, or type your own. Leave it empty if there is nothing you know of.</p>
      ${chips('trigger', TRIGGERS.map((x) => [x, x]), TRIGGERS.filter((x) => t.includes(x.toLowerCase())), true)}
      <label class="q-field"><span>Allergies and ingredients to avoid</span><input id="q-allergies" type="text" placeholder="For example fragrance, a preservative, a plant extract" value="${esc(p.allergies)}"></label>
      <p class="q-small">Why we ask: a fragrance allergy puts fragrance-free products first. In the app, products that list one of these are marked down in your skin match, and the reason is shown.</p>`;
  }
  if (page === 'safety')
    return `<h3 class="q-title">Safety check</h3>
      <h4 class="q-sub">Does your skin react easily?</h4>
      ${chips('sensitivity', [['none', 'Rarely'], ['some', 'Sometimes'], ['high', 'Often'], ['unknown', PNTA]], answered.sensitivity ? p.sensitivity : undefined)}
      ${askPregnancy() ? `<h4 class="q-sub">Pregnant, breastfeeding or planning to be?</h4>${chips('pregnancy', [['no', 'No'], ['yes', 'Yes'], ['na', 'Not applicable'], ['unknown', PNTA]], answered.pregnancy ? p.pregnancy : undefined)}` : ''}
      <h4 class="q-sub">Using isotretinoin or a prescription retinoid?</h4>
      ${chips('medication', [['none', 'Neither'], ['isotretinoin', 'Isotretinoin'], ['rx-retinoid', 'Prescription retinoid'], ['unknown', PNTA]], answered.medication ? med() : undefined)}`;
  if (page === 'effort')
    return `<h3 class="q-title">How much time do you want to spend on your skin?</h3>
      <p class="q-lead">Your routine is built to fit. You can change this any time in the app.</p>
      <div class="q-efforts" role="radiogroup">${R.EFFORTS.map((e) => {
        const on = answered.effort && p.routineLength === e.id;
        return `<button type="button" class="q-effort${on ? ' on' : ''}" data-set="routineLength" data-val="${esc(e.id)}" role="radio" aria-checked="${on}"><span class="q-effort-top"><b>${esc(e.label)}</b><span>${esc(e.time)}</span></span><span class="q-effort-detail">${esc(e.detail)}</span></button>`;
      }).join('')}</div>
      <p class="q-small">The safety rules are the same at every level. Strong ingredients such as retinoids and acids always go on separate evenings.</p>`;
  return '';
}

function render() {
  const page = PAGES[step];
  const last = step === PAGES.length - 1;
  const disabled = (page === 'age' && (ageMissing() || (ageChecked && (ageInvalid() || tooYoung())))) || (page === 'safety' && safetyOpen()) || (page === 'effort' && effortOpen());
  root.innerHTML = `
    <div class="q-progress" aria-hidden="true"><i style="width:${((step + 1) / PAGES.length) * 100}%"></i></div>
    <p class="q-count">${step + 1} of ${PAGES.length}</p>
    <div class="q-page">${pageHtml(page)}</div>
    <div class="q-foot">
      ${step > 0 ? '<button type="button" class="q-back" data-act="back">Back</button>' : ''}
      <button type="button" class="q-next" data-act="next"${disabled ? ' disabled' : ''}>${last ? 'Build my routine' : 'Continue'}</button>
    </div>`;
  const input = root.querySelector('input');
  if (input && !matchMedia('(hover: none)').matches) input.focus({ preventScroll: true });
}

function next() {
  const page = PAGES[step];
  if (page === 'age') {
    if (ageMissing()) return;
    const a = age();
    const needsMessage = ageInvalid() || tooYoung() || (a !== undefined && a < R.ADULT_AGE);
    if (needsMessage && !ageChecked) { ageChecked = true; return render(); }
    if (ageInvalid() || tooYoung()) return;
  }
  if (page === 'safety' && safetyOpen()) return;
  if (page === 'effort' && effortOpen()) return;
  if (step < PAGES.length - 1) { step++; render(); root.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  finish();
}

function set(name, val) {
  if (name === 'goals') {
    if (p.goals.includes(val)) p.goals = p.goals.filter((x) => x !== val);
    else if (val === 'maintain') p.goals = ['maintain'];
    else p.goals = [...p.goals.filter((x) => x !== 'maintain'), val];
  } else if (name === 'trigger') {
    const t = triggers();
    const has = t.some((x) => x.toLowerCase() === val.toLowerCase());
    p.allergies = (has ? t.filter((x) => x.toLowerCase() !== val.toLowerCase()) : [...t, val]).join(', ');
  } else if (name === 'medication') {
    p.medications = [val];
    answered.medication = true;
  } else if (name === 'routineLength') {
    p.routineLength = val;
    answered.effort = true;
  } else {
    p[name] = val;
    if (name in answered) answered[name] = true;
  }
  render();
}

// ---------- result ----------
function finish() {
  const profile = { ...p, name: p.name?.trim() || undefined, age: age(), pregnancy: askPregnancy() ? p.pregnancy : 'na', completedAt: new Date().toISOString() };
  const routine = R.generateRoutine(profile);
  const goalLabel = Object.fromEntries(GOALS);
  const why = R.routineRationale(profile, routine)
    .map((r) => {
      if (r.outcome === 'step' && R.STEP_LIBRARY[r.stepVariant]) return `<li><b>${esc(goalLabel[r.goal])}</b>: ${esc(R.STEP_LIBRARY[r.stepVariant].title)}</li>`;
      if (r.outcome === 'basics') return `<li><b>${esc(goalLabel[r.goal])}</b>: covered by the basics</li>`;
      if (r.outcome === 'blocked') return `<li><b>${esc(goalLabel[r.goal])}</b>: ${esc(r.reasons[0] ?? 'left out for safety')}</li>`;
      return '';
    })
    .join('');

  const half = (slot, label, icon) => {
    const steps = routine.steps.filter((s) => s.slot === slot);
    return `<div class="r-half ${slot}">
      <h4><span class="r-ico" aria-hidden="true">${icon}</span>${label}</h4>
      <ol>${steps
        .map((s, i) => {
          const lib = R.STEP_LIBRARY[s.variant];
          const x = R.productForStep(s, profile);
          const img = x && images[x.id] ? `<img src="img/products/${esc(images[x.id])}" alt="" loading="lazy" width="56" height="56">` : `<span class="r-ph" aria-hidden="true">${esc((x?.brand ?? lib?.title ?? '?').slice(0, 2))}</span>`;
          return `<li>${img}<div><span class="r-step">Step ${i + 1}${s.optional ? ' · Optional' : ''}</span><b>${esc(lib?.title ?? s.variant)}</b>${x ? `<span class="r-prod">${esc(x.brand)} ${esc(x.name)}</span>` : ''}<span class="r-days">${esc(R.daysText(s, slot))}</span></div></li>`;
        })
        .join('')}</ol>
    </div>`;
  };

  root.innerHTML = `
    <div class="r-head">
      <span class="eyebrow">Your routine</span>
      <h3 class="q-title">${profile.name ? `${esc(profile.name)}, here is your routine.` : 'Here is your routine.'}</h3>
      <p class="q-lead">A ${esc((R.EFFORTS.find((e) => e.id === profile.routineLength)?.label ?? 'Medium').toLowerCase())} routine, built from your answers by the same rules the app uses. Get a more detailed face analysis in the app, and your routine adjusts to what your skin actually shows.</p>
      ${why ? `<ul class="r-why">${why}</ul>` : ''}
    </div>
    <div class="r-grid">${half('am', 'Morning', '☀︎')}${half('pm', 'Evening', '☾')}</div>
    <div class="r-more">
      <div>
        <h4>See the rest in the app</h4>
        <ul>
          <li>Why each step is there, how to use it, and how to start it</li>
          <li><b>A more detailed face analysis</b> from guided photos of your face, which tunes this routine to your skin</li>
          <li>Your skin match for every product, and swaps that suit you</li>
          <li>Daily selfie check-ins to see change over weeks</li>
          <li>Retinoids and acids that start on a few evenings and build up as your skin gets used to them, paused if your check-ins show irritation</li>
        </ul>
      </div>
      <a class="soon r-cta" href="${APP_URL}">Download bom lab <small>on the App Store</small></a>
    </div>
    <p class="q-small r-note">Your answers stayed in this browser and were not sent anywhere. This is general skincare guidance, not medical advice. <button type="button" class="q-link" data-act="restart">Start over</button></p>`;
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- events ----------
root.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.disabled) return;
  if (b.dataset.set) return set(b.dataset.set, b.dataset.val);
  if (b.dataset.act === 'next') return next();
  if (b.dataset.act === 'back') { step--; ageChecked = false; return render(); }
  if (b.dataset.act === 'restart') return start();
});
root.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'q-name') p.name = t.value;
  if (t.id === 'q-allergies') p.allergies = t.value;
  if (t.id === 'q-age') {
    t.value = t.value.replace(/[^0-9]/g, '');
    ageText = t.value;
    ageChecked = false;
    const btn = root.querySelector('[data-act="next"]');
    if (btn) btn.disabled = ageMissing();
  }
});
root.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); next(); }
});
document.querySelectorAll('[data-start-quiz]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); start(); }));
