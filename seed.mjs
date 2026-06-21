// seed.mjs — Reseed threads + comments for every forum, then rebuild all stats.
// Usage: node seed.mjs
// Requires: serviceAccount.json in the project root.
//   Firebase Console → Project Settings → Service Accounts → Generate New Private Key

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = join(__dirname, 'serviceAccount.json');

if (!existsSync(SA_PATH)) {
  console.error('❌  serviceAccount.json not found in project root.');
  console.error('   Firebase Console → Project Settings → Service Accounts → Generate New Private Key');
  process.exit(1);
}

initializeApp({ credential: cert(JSON.parse(readFileSync(SA_PATH, 'utf8'))) });
const db = getFirestore();

// ── Wipe previous seed data ────────────────────────────────────────────────
async function deleteCollection(collPath, batchSize = 400) {
  const ref = db.collection(collPath);
  let deleted = 0;
  while (true) {
    const snap = await ref.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;
  }
  return deleted;
}

async function deleteThreadsWithComments(batchSize = 100) {
  const snap = await db.collection('threads').get();
  for (const threadDoc of snap.docs) {
    const commentsSnap = await threadDoc.ref.collection('comments').get();
    if (!commentsSnap.empty) {
      const batch = db.batch();
      commentsSnap.docs.forEach((c) => batch.delete(c.ref));
      await batch.commit();
    }
    await threadDoc.ref.delete();
  }
  return snap.size;
}

async function wipe() {
  process.stdout.write('🗑️   Wiping previous data... ');
  await deleteThreadsWithComments();
  await deleteCollection('upvotes');
  await deleteCollection('reactions');
  await db.collection('stats').doc('global').delete().catch(() => {});
  for (const sub of ['forums', 'schools', 'daily', 'users']) {
    await deleteCollection(`stats/${sub}/entries`);
    await db.collection('stats').doc(sub).delete().catch(() => {});
  }
  console.log('done.\n');
}

// ── Mock seed users (no real auth required — admin SDK bypasses rules) ─────
const USERS = [
  { id: 'seed_u1', username: 'marko_jbt',    school: 'Гимназија Јосип Броз - Тито',         schoolId: 'gimnazija-josip-broz-tito' },
  { id: 'seed_u2', username: 'ana_orce',     school: 'Гимназија Орце Николов',              schoolId: 'gimnazija-orce-nikolov' },
  { id: 'seed_u3', username: 'stefan_k',     school: 'Гимназија Раде Јовчевски - Корчагин', schoolId: 'gimnazija-rade-jovchevski-korchagin' },
  { id: 'seed_u4', username: 'elena_karev',  school: 'Гимназија Никола Карев',              schoolId: 'gimnazija-nikola-karev' },
  { id: 'seed_u5', username: 'bojan_pupin',  school: 'СУГС Михајло Пупин',                  schoolId: 'sugs-mihajlo-pupin' },
  { id: 'seed_u6', username: 'ivana_nova',   school: 'НОВА Меѓународно Училиште',           schoolId: 'nova-megjunarodno-uciliste' },
];
const u = (i) => USERS[i % USERS.length];

function pastTs(daysAgo, extraHours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - extraHours);
  return Timestamp.fromDate(d);
}

// ── Topic forum seed data ──────────────────────────────────────────────────
// Each entry: { forumId, title, body, authorIdx, comments?: [{body, authorIdx}] }
const TOPIC_THREADS = [
  // Општо
  {
    forumId: 'general', authorIdx: 0,
    title: 'Здраво! Дојдов да се претставам 👋',
    body: 'Јас сум Марко, трета година во ЈБТ. Штотуку дознав за оваа платформа и мислам дека е одлична идеја — конечно место каде средношколците можат да разговараат. Ако некој е од ЈБТ, зборете се!',
    comments: [
      { body: 'Добредојде Марко! Јас сум од Орце, второ лето. Се надевам дека ќе биде активна 🙂', authorIdx: 1 },
      { body: 'Поздрав! ЈБТ е легенда. Добродојде на сите!', authorIdx: 2 },
    ],
  },
  {
    forumId: 'general', authorIdx: 1,
    title: 'Кои се вашите планови по завршување на средното?',
    body: 'Сум во четврта и веќе се прашувам — ФИНКИ, медицина, или да одам во странство? Интересира ме кај другите каде мислат да одат.',
    comments: [
      { body: 'Јас сакам ФЕИТ, ама сè уште не сум сигурен. Стресот е реален 😅', authorIdx: 4 },
      { body: 'Размислувам да аплицирам во Австрија — има добри програми на англиски.', authorIdx: 5 },
      { body: 'Медицина е мојот план, само ми е страв од поените на матурата...', authorIdx: 3 },
    ],
  },
  {
    forumId: 'general', authorIdx: 3,
    title: 'Омилено место за учење во Скопје?',
    body: 'Дома ми е тешко да учам — секогаш се расеам. Кој знае добри места каде е мирно и може да се седи со лаптоп?',
    comments: [
      { body: 'Градската библиотека е сосема добра, и е бесплатна!', authorIdx: 2 },
      { body: 'Некои кафулиња во Центар имаат тивки катови. Ги препорачувам.', authorIdx: 0 },
    ],
  },

  // Државна матура
  {
    forumId: 'drzavna-matura', authorIdx: 2,
    title: 'Кои предмети ви одат најтешко за матура?',
    body: 'За мене е дефинитивно математиката. Задачите со интеграли ми прават главоболки. Вас?',
    comments: [
      { body: 'Биологија! Толку многу термини за напамет...', authorIdx: 3 },
      { body: 'Физика без сомнение. Ама барем задачите имаат логика, не само меморирање.', authorIdx: 0 },
      { body: 'Мне ми е тежок македонскиот — делот со теорија на литература.', authorIdx: 1 },
    ],
  },
  {
    forumId: 'drzavna-matura', authorIdx: 4,
    title: 'Материјали за подготовка — споделете ги вашите!',
    body: 'Ги собирам сите корисни материјали за државна матура. Имате некои добри линкови, PDF-ови, или YouTube плејлисти?',
    comments: [
      { body: 'Има канал на YT „Математика МК" — многу добро објаснува за матура.', authorIdx: 5 },
      { body: 'За историја, старите тестови од МОН се злато.', authorIdx: 2 },
    ],
  },

  // Помош при учење
  {
    forumId: 'pomos-pri-ucenje', authorIdx: 3,
    title: 'Некој за заедничко учење математика? (3та година)',
    body: 'Ми треба некој да учи со мене математика, особено интеграли и диференцијали. Може онлајн или во живо во Скопје.',
    comments: [
      { body: 'Јас сум! Можеме да се договориме. Исто сум во 3та.', authorIdx: 0 },
      { body: 'Можам и јас да се приклучам ако немате ништо против 🙂', authorIdx: 5 },
    ],
  },
  {
    forumId: 'pomos-pri-ucenje', authorIdx: 5,
    title: 'Добри YouTube канали за физика?',
    body: 'Барам нешто на македонски или српски за физика. На англиски исто добро, ако е добро објаснето.',
    comments: [
      { body: 'Khan Academy е добра опција за основи.', authorIdx: 4 },
      { body: 'За српски пробај „Физика са Петром" — регионален и многу добар.', authorIdx: 1 },
    ],
  },

  // Вештачка интелигенција
  {
    forumId: 'vestachka-inteligencija', authorIdx: 0,
    title: 'ChatGPT за учење — помага или штети?',
    body: 'Наставниците велат дека го уништува учењето, ама јас сметам дека зависи како го користиш. Кои се вашите искуства?',
    comments: [
      { body: 'Јас го користам само да ги проверувам моите одговори, не да ги пишувам директно. Тоа е ОК?', authorIdx: 2 },
      { body: 'Сè зависи дали навистина разбираш или само копираш.', authorIdx: 5 },
      { body: 'За математика може да биде одличен — го прашувам да ми објасни чекор по чекор.', authorIdx: 3 },
    ],
  },
  {
    forumId: 'vestachka-inteligencija', authorIdx: 4,
    title: 'Кои AI алатки ги користите покрај ChatGPT?',
    body: 'Тестирав Perplexity, Claude, Gemini... Секој има свои предности. Споделете ги вашите омилени.',
    comments: [
      { body: 'Claude ми се допаѓа за долги текстови и анализи.', authorIdx: 0 },
      { body: 'Perplexity за барање информации со извори — многу корисно.', authorIdx: 3 },
    ],
  },

  // Факултети
  {
    forumId: 'fakulteti', authorIdx: 1,
    title: 'ФИНКИ или ФЕИТ — каде да идам?',
    body: 'Двете ме интересираат, ама имаат различен фокус. ФИНКИ е повеќе менаџмент, ФЕИТ е потехничко. Некој со искуство?',
    comments: [
      { body: 'ФЕИТ ако сакаш хардвер и електроника. ФИНКИ ако сакаш IT менаџмент.', authorIdx: 4 },
      { body: 'Брат ми е на ФИНКИ и многу задоволен. Добри врски со компании.', authorIdx: 2 },
    ],
  },
  {
    forumId: 'fakulteti', authorIdx: 3,
    title: 'Искуства од уписи на факултет во Македонија?',
    body: 'Некој поминал низ процесот неодамна? Кои се трикови и работи за кои никој не ве предупредува?',
    comments: [
      { body: 'Документите мора да бидат нотарски заверени — тоа не е очигледно пред да дојдеш таму.', authorIdx: 5 },
      { body: 'Пријавувај се во повеќе факултети паралелно — не чекај само на еден.', authorIdx: 0 },
    ],
  },

  // Странски јазици
  {
    forumId: 'strani-jazici', authorIdx: 5,
    title: 'IELTS — некој го полагал неодамна?',
    body: 'Треба ми IELTS за апликација во странство. Посебно ме интересира делот со Writing Task 2 — колку е тежок?',
    comments: [
      { body: 'Го полагав во март, добив 7.0. Writing Task 2 бара добра структура — вовед, 2 параграфи, заклучок.', authorIdx: 1 },
      { body: 'Пробните тестови на официјалниот IELTS сајт се многу корисни.', authorIdx: 0 },
    ],
  },
  {
    forumId: 'strani-jazici', authorIdx: 2,
    title: 'Duolingo vs Babbel vs останати — кое работи?',
    body: 'Учам германски и сакам да знам кои апликации реално работат. Duolingo ми се чини малку плитко.',
    comments: [
      { body: 'Anki за вокабулар е незаменливо. Duolingo е само за почетници.', authorIdx: 3 },
      { body: 'Goethe Institut во Скопје нуди курсеви — малку поскапо ама многу поквалитетно.', authorIdx: 4 },
    ],
  },

  // Кариерно водење
  {
    forumId: 'karierno-vodenje', authorIdx: 4,
    title: 'Каде да барам пракса во Скопје (IT)?',
    body: 'Сум во 4та година и сакам да најдам пракса во некоја IT компанија. Имате контакти или совети?',
    comments: [
      { body: 'Погледај Seavus, Endava, Netcetera — сите имаат intern програми.', authorIdx: 0 },
      { body: 'LinkedIn е твој пријател. Направи профил и аплицирај директно.', authorIdx: 5 },
    ],
  },
  {
    forumId: 'karierno-vodenje', authorIdx: 1,
    title: 'Програмирање или дигитален маркетинг — кариера?',
    body: 'Размислувам меѓу две насоки. Програмирањето ми се допаѓа ама маркетингот изгледа позабавно. Мислења?',
    comments: [
      { body: 'И двете имаат иднина. Зависи дали сакаш да кодираш или да разговараш со луѓе.', authorIdx: 3 },
    ],
  },

  // Студии во странство
  {
    forumId: 'studii-vo-stranstvo', authorIdx: 3,
    title: 'Некој аплицирал за факултет во Германија?',
    body: 'Ме интересира да студирам компјутерски науки во Германија. Процедурата изгледа сложена — некој со искуство?',
    comments: [
      { body: 'Uni-assist е платформата за повеќето германски универзитети. Треба нострификација на документи.', authorIdx: 5 },
      { body: 'Јазикот е клуч — B2/C1 германски или IELTS 6.5+ за програми на англиски.', authorIdx: 2 },
    ],
  },
  {
    forumId: 'studii-vo-stranstvo', authorIdx: 0,
    title: 'Erasmus+ за средношколци — постои ли?',
    body: 'Слушнав дека Erasmus не е само за студенти. Некој знае повеќе за програмите за средношколци?',
    comments: [
      { body: 'Да, постои KA1 за ученички размени. Директорот на училиштето мора да аплицира.', authorIdx: 1 },
      { body: 'И eTwinning е добра опција — виртуелна соработка со европски ученици.', authorIdx: 4 },
    ],
  },

  // Ментално здравје
  {
    forumId: 'mentalno-zdravje', authorIdx: 2,
    title: 'Стресот пред испити е неподнослив — некој слично?',
    body: 'Секој пат пред тест ми се тресат рацете и не можам да спијам. Знам дека е нормално ама сакам да чујам дали некој нашол начин да се справи.',
    comments: [
      { body: 'Дишни вежби помагаат многу. 4-7-8 техника — обиди се.', authorIdx: 4 },
      { body: 'Јас пишувам листа со нешта за кои сум благодарен пред спиење. Работи!', authorIdx: 1 },
      { body: 'Важно е да знаеш дека оценката не го дефинира твојот вредност.', authorIdx: 5 },
    ],
  },
  {
    forumId: 'mentalno-zdravje', authorIdx: 4,
    title: 'Совети за подобар сон во матурска година',
    body: 'Учам до 2 часот ноќно и потоа не можам да заспијам. Следниот ден сум зомби. Некои совети?',
    comments: [
      { body: 'Телефон надвор од спалната соба — game changer за мене.', authorIdx: 3 },
      { body: 'Обиди се да спиеш и станеш во исто време секој ден, дури и викенди.', authorIdx: 0 },
    ],
  },

  // Вон-наставни активности
  {
    forumId: 'vannastavni-aktivnosti', authorIdx: 5,
    title: 'Кој спорт го тренирате покрај училиште?',
    body: 'Јас тренирам кошарка 3 пати неделно. Убаво е за глава по школо. Вас?',
    comments: [
      { body: 'Пливање! Многу релаксирачко и добро за телото.', authorIdx: 2 },
      { body: 'Фудбал секоја недела со другари. Неформално ама се потееме добро 😄', authorIdx: 0 },
    ],
  },
  {
    forumId: 'vannastavni-aktivnosti', authorIdx: 1,
    title: 'Дебатни клубови во Скопје за средношколци?',
    body: 'Ме интересира дебата. Знае ли некој каде можам да се приклучам?',
    comments: [
      { body: 'YMCA Скопје има дебатен клуб. И некои гимназии имаат интерни секции.', authorIdx: 3 },
    ],
  },

  // Технологија и програмирање
  {
    forumId: 'tehnologija-i-programiranje', authorIdx: 0,
    title: 'Кој програмски јазик да научам прв?',
    body: 'Никогаш не сум пишувал код. Дали да почнам со Python, JavaScript или нешто друго? Целта е да работам во IT.',
    comments: [
      { body: 'Python за почетници е идеален. Чист синтакс, голема заедница, многу работни места.', authorIdx: 4 },
      { body: 'JavaScript ако сакаш брзо да видиш резултати на веб страница — многу мотивира.', authorIdx: 5 },
      { body: 'Python прво, JavaScript потоа. Тоа е стандарден пат.', authorIdx: 2 },
    ],
  },
  {
    forumId: 'tehnologija-i-programiranje', authorIdx: 3,
    title: 'Проекти за портфолио пред факултет — идеи?',
    body: 'Сакам да имам нешто да покажам на интервју. Кои проекти се импресивни за почетник?',
    comments: [
      { body: 'Todo апликација е клише. Направи нешто за кое навистина те е грижа — игра, алатка, нешто лично.', authorIdx: 0 },
      { body: 'Направи клон на некоја позната апликација — учиш повеќе отколку со туторијал.', authorIdx: 1 },
    ],
  },

  // Забава и култура
  {
    forumId: 'zabava-i-kultura', authorIdx: 1,
    title: 'Последен филм/серија што ја гледавте?',
    body: 'Јас завршив „Severance" — mind-blowing. Некој видел нешто добро напоследок?',
    comments: [
      { body: 'Управо ја гледам „The Bear". Не е класична серија ама е одлична.', authorIdx: 5 },
      { body: '„Dune: Part Two" во кино — беше спектакл визуелно!', authorIdx: 3 },
    ],
  },
  {
    forumId: 'zabava-i-kultura', authorIdx: 4,
    title: 'Музика за учење — ваши плејлисти?',
    body: 'Јас слушам lo-fi beats секогаш кога учам. Некој слуша нешто поинакво?',
    comments: [
      { body: 'Класична музика — Шопен и Дебиси. Нема зборови за да те расеаат.', authorIdx: 2 },
      { body: 'Ambient звуци, типа дожд или кафуле. Calm.com е добар.', authorIdx: 0 },
    ],
  },

  // Спорт
  {
    forumId: 'sport', authorIdx: 2,
    title: 'Некој игра фудбал во Скопје? Барам тим 🏃',
    body: 'Сакам да се приклучам на некој неформален тим за викенд. Јас сум нападач, играм 3-4 години аматерски.',
    comments: [
      { body: 'Ние имаме тим, играме секоја сабота кај Карпош. Пишете во приватно.', authorIdx: 0 },
      { body: 'Фудбал е живот 🙌 Дај контакт!', authorIdx: 4 },
    ],
  },
  {
    forumId: 'sport', authorIdx: 5,
    title: 'Фитнес за тинејџери — совети за почеток?',
    body: 'Сакам да почнам да одам во теретана ама не знам од каде да почнам. Дали е безбедно за 17 години?',
    comments: [
      { body: 'Да, безбедно е со правилна техника. Важно е прво да работиш со тренер барем неколку сесии.', authorIdx: 1 },
    ],
  },

  // Социјални прашања
  {
    forumId: 'socijalni-prasanja', authorIdx: 1,
    title: 'Еколошки иницијативи — каде можеме да учествуваме?',
    body: 'Сакам да направам нешто значајно за околината. Постојат ли организации кои примаат млади волонтери?',
    comments: [
      { body: '„Чиста животна средина" е добра НВО. И училиштата понекогаш организираат акции.', authorIdx: 3 },
      { body: 'Fridays for Future имаат група во Скопје.', authorIdx: 0 },
    ],
  },
  {
    forumId: 'socijalni-prasanja', authorIdx: 4,
    title: 'Врсничко насилство — реален проблем во нашите училишта?',
    body: 'Слушам различни искуства. Некои велат дека е голем проблем, други дека е претерано. Кое е вашето искуство?',
    comments: [
      { body: 'Постои секаде, само некои училишта имаат подобри механизми за справување.', authorIdx: 2 },
      { body: 'Важно е да има анонимни канали за пријавување — без тоа никој не зборува.', authorIdx: 5 },
    ],
  },

  // Претстави се
  {
    forumId: 'pretstavi-se', authorIdx: 1,
    title: 'Јас сум Ана, второ лето во Орце Николов 🙂',
    body: 'Здраво! Се вика Ана, 16 години, го сакам читањето и цртањето. Дојдов овде бидејќи сакав место каде средношколците разговараат за вистински нешта. Поздрав до сите!',
    comments: [
      { body: 'Добредојде Ана! 🎉 Убаво е да има уметници тука!', authorIdx: 3 },
      { body: 'Поздрав! Орце Николов е добра школа 🙌', authorIdx: 0 },
    ],
  },
  {
    forumId: 'pretstavi-se', authorIdx: 4,
    title: 'Бојан, 4та година, Михајло Пупин — поздрав!',
    body: 'Јас сум Бојан, последна година. Ме интересираат електроника и роботика. Ако некој сака да зборуваме за технологија — тука сум!',
    comments: [
      { body: 'Роботика! Одлично 🤖 Дали правиш некои проекти?', authorIdx: 5 },
      { body: 'Добредојде Бојан! Ќе биде интересно да имаме некој технички ориентиран.', authorIdx: 2 },
    ],
  },

  // Off-Topic
  {
    forumId: 'off-topic', authorIdx: 3,
    title: 'Шеги за училиштето 😂',
    body: 'Ајде да се насмееме малку. Почнувам: „Зошто математичарите не можат да паркираат? Бидејќи секогаш се во грешен квадрант!"',
    comments: [
      { body: '„Наставникот по историја вели учи историја да не ги повторуваш грешките. Ама јас ги повторувам тестовите сепак."', authorIdx: 2 },
      { body: 'Добро 😂😂', authorIdx: 0 },
    ],
  },
  {
    forumId: 'off-topic', authorIdx: 5,
    title: 'Рецепт за преживување на матурска ноќ',
    body: 'Состојки: 3л кафе, 1 пакет чипс, бескрајна тага, YouTube за прокрастинација, и некое чудо на крај. Резултат: 4 часа сон и некако положен тест 🥲',
    comments: [
      { body: 'Ова е документарец, не шега 😭', authorIdx: 1 },
      { body: 'Додај и „TikTok scroll во 3 часот" во рецептот.', authorIdx: 4 },
    ],
  },
];

// ── School forum threads (2 per school) ───────────────────────────────────
const SCHOOL_IDS = [
  'gimnazija-josip-broz-tito',
  'gimnazija-orce-nikolov',
  'gimnazija-rade-jovchevski-korchagin',
  'gimnazija-zef-ljush-marku',
  'gimnazija-nikola-karev',
  'gimnazija-georgi-dimitrov',
  'sugs-mihajlo-pupin',
  'sugs-8-mi-septemvri',
  'sugs-brakja-miladinovci',
  'sugs-cvetan-dimov',
  'sugs-vlado-tasevski',
  'sugs-zdravko-cvetkovski',
  'sugs-marija-kiri-sklodovska',
  'sugs-shaip-jusuf',
  'sugs-arseni-jovkov',
  'nova-megjunarodno-uciliste',
];

const SCHOOL_SHORT = {
  'gimnazija-josip-broz-tito': 'ЈБТ',
  'gimnazija-orce-nikolov': 'Орце Николов',
  'gimnazija-rade-jovchevski-korchagin': 'Корчагин',
  'gimnazija-zef-ljush-marku': 'Зеф Љуш Марку',
  'gimnazija-nikola-karev': 'Никола Карев',
  'gimnazija-georgi-dimitrov': 'Георги Димитров',
  'sugs-mihajlo-pupin': 'Михајло Пупин',
  'sugs-8-mi-septemvri': '8-ми Септември',
  'sugs-brakja-miladinovci': 'Браќа Миладиновци',
  'sugs-cvetan-dimov': 'Цветан Димов',
  'sugs-vlado-tasevski': 'Владо Тасевски',
  'sugs-zdravko-cvetkovski': 'Здравко Цветковски',
  'sugs-marija-kiri-sklodovska': 'Марија Кири',
  'sugs-shaip-jusuf': 'Шаип Јусуф',
  'sugs-arseni-jovkov': 'Арсени Јовков',
  'nova-megjunarodno-uciliste': 'НОВА',
};

const SCHOOL_THREADS = SCHOOL_IDS.flatMap((schoolId, si) => {
  const name = SCHOOL_SHORT[schoolId];
  const forumId = `school-${schoolId}`;
  return [
    {
      forumId, authorIdx: si,
      title: `Добредојде во форумот на ${name}! 👋`,
      body: `Ова е форумот за ученици од нашето училиште. Тука можеме да разговараме за распореди, настани, предмети и сè друго поврзано со ${name}. Споделете ги вашите прашања и искуства!`,
      comments: [
        { body: `Одлично е да имаме свој простор! Поздрав до сите од ${name} 🏫`, authorIdx: si + 1 },
        { body: 'Конечно место каде можеме да зборуваме слободно!', authorIdx: si + 2 },
      ],
    },
    {
      forumId, authorIdx: si + 1,
      title: 'Прашања за наставници, распоред и белешки?',
      body: 'Ова е место каде можеме да разменуваме белешки, да прашаме за распоредот или да разговараме за наставниците. Никој не е сам во ова 😄',
      comments: [
        { body: 'Некој има белешки од биологија за вторник?', authorIdx: si + 3 },
      ],
    },
  ];
});

const ALL_THREADS = [...TOPIC_THREADS, ...SCHOOL_THREADS];

// ── Main seed function ─────────────────────────────────────────────────────
async function seed() {
  await wipe();

  const forumStats = {};
  const schoolStats = {};
  let totalThreads = 0;
  let totalComments = 0;
  const now = Timestamp.now();

  console.log(`\n🌱  Seeding ${ALL_THREADS.length} threads across ${new Set(ALL_THREADS.map(t => t.forumId)).size} forums...\n`);

  for (let ti = 0; ti < ALL_THREADS.length; ti++) {
    const t = ALL_THREADS[ti];
    const author = u(t.authorIdx);
    const forumId = t.forumId;
    const schoolId = forumId.startsWith('school-')
      ? forumId.slice('school-'.length)
      : author.schoolId;

    // Spread threads over the past 30 days, newest first
    const daysAgo = Math.round(((ALL_THREADS.length - 1 - ti) / ALL_THREADS.length) * 28) + 1;
    const threadTs = pastTs(daysAgo);

    const threadRef = db.collection('threads').doc();
    const commentCount = (t.comments || []).length;

    await threadRef.set({
      forumId,
      authorId: author.id,
      authorUsername: author.username,
      authorSchool: author.school,
      title: t.title,
      body: t.body,
      attachments: [],
      upvoteCount: Math.floor(Math.random() * 20),
      commentCount,
      viewCount: Math.floor(Math.random() * 150) + 10,
      isFeatured: false,
      isEdited: false,
      isDeleted: 'no',
      createdAt: threadTs,
      updatedAt: threadTs,
    });

    totalThreads++;
    forumStats[forumId] = forumStats[forumId] || { threadCount: 0, commentCount: 0 };
    forumStats[forumId].threadCount++;
    schoolStats[schoolId] = schoolStats[schoolId] || { threadCount: 0, commentCount: 0 };
    schoolStats[schoolId].threadCount++;

    for (let ci = 0; ci < commentCount; ci++) {
      const c = t.comments[ci];
      const commentAuthor = u(c.authorIdx);
      const commentTs = pastTs(daysAgo - 1, ci + 1);

      await threadRef.collection('comments').doc().set({
        authorId: commentAuthor.id,
        authorUsername: commentAuthor.username,
        authorSchool: commentAuthor.school,
        parentCommentId: null,
        body: c.body,
        mentions: [],
        upvoteCount: Math.floor(Math.random() * 10),
        isEdited: false,
        isDeleted: 'no',
        createdAt: commentTs,
        updatedAt: commentTs,
      });

      totalComments++;
      forumStats[forumId].commentCount++;
      schoolStats[schoolId].commentCount++;
    }

    process.stdout.write(`\r  ✍️  ${ti + 1}/${ALL_THREADS.length}`);
  }

  console.log('\n\n📊  Writing stats...\n');

  // Global stats
  await db.collection('stats').doc('global').set({
    totalThreads,
    totalComments,
    totalUpvotes: 0,
    totalUsers: 0,
    totalReports: 0,
    updatedAt: now,
  });

  // Per-forum stats + update threadCount on the forums collection doc itself
  for (const [forumId, s] of Object.entries(forumStats)) {
    await db.collection('stats').doc('forums').collection('entries').doc(forumId).set({
      forumId,
      threadCount: s.threadCount,
      commentCount: s.commentCount,
      updatedAt: now,
    });
    // forums/{forumId}.threadCount is what Forum.jsx renders directly
    const forumDoc = db.collection('forums').doc(forumId);
    const forumSnap = await forumDoc.get();
    if (forumSnap.exists) {
      await forumDoc.update({ threadCount: s.threadCount, lastActivityAt: now });
    }
  }

  // Per-school stats (leaderboard)
  for (const [schoolId, s] of Object.entries(schoolStats)) {
    await db.collection('stats').doc('schools').collection('entries').doc(schoolId).set({
      schoolId,
      threadCount: s.threadCount,
      commentCount: s.commentCount,
      userCount: 0,
      updatedAt: now,
    });
  }

  // Today's daily entry
  const today = new Date().toISOString().split('T')[0];
  await db.collection('stats').doc('daily').collection('entries').doc(today).set({
    date: today,
    newThreads: totalThreads,
    newComments: totalComments,
    newUsers: 0,
    newUpvotes: 0,
    newReports: 0,
    updatedAt: now,
  });

  console.log(`✅  Done!`);
  console.log(`   ${totalThreads} threads`);
  console.log(`   ${totalComments} comments`);
  console.log(`   ${Object.keys(forumStats).length} forums with stats`);
  console.log(`   ${Object.keys(schoolStats).length} schools in leaderboard\n`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌  Seed failed:', err);
  process.exit(1);
});
