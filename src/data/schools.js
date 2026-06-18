// Средни училишта во Скопје
// Структура: {id, name, shortName (опционално), city, type}
// За додавање нови градови подоцна: додај нов array и комбинирај во SCHOOLS

export const SKOPJE_SCHOOLS = [
  // Гимназии
  {
    id: 'gimnazija-josip-broz-tito',
    name: 'Гимназија Јосип Броз - Тито',
    shortName: 'ЈБТ',
    city: 'Скопје',
    type: 'gymnasium',
  },
  {
    id: 'gimnazija-orce-nikolov',
    name: 'Гимназија Орце Николов',
    shortName: 'Орце Николов',
    city: 'Скопје',
    type: 'gymnasium',
  },
  {
    id: 'gimnazija-rade-jovchevski-korchagin',
    name: 'Гимназија Раде Јовчевски - Корчагин',
    shortName: 'Корчагин',
    city: 'Скопје',
    type: 'gymnasium',
  },
  {
    id: 'gimnazija-zef-ljush-marku',
    name: 'Гимназија Зеф Љуш Марку',
    shortName: 'Зеф Љуш Марку',
    city: 'Скопје',
    type: 'gymnasium',
  },
  {
    id: 'gimnazija-nikola-karev',
    name: 'Гимназија Никола Карев',
    shortName: 'Никола Карев',
    city: 'Скопје',
    type: 'gymnasium',
  },
  {
    id: 'gimnazija-georgi-dimitrov',
    name: 'Гимназија Георги Димитров',
    shortName: 'Георги Димитров',
    city: 'Скопје',
    type: 'gymnasium',
  },

  // СУГС (Средни Училишта на Град Скопје)
  {
    id: 'sugs-mihajlo-pupin',
    name: 'СУГС Михајло Пупин',
    shortName: 'Михајло Пупин',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-8-mi-septemvri',
    name: 'СУГС 8-ми Септември',
    shortName: '8-ми Септември',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-brakja-miladinovci',
    name: 'СУГС Браќа Миладиновци',
    shortName: 'Браќа Миладиновци',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-cvetan-dimov',
    name: 'СУГС Цветан Димов',
    shortName: 'Цветан Димов',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-vlado-tasevski',
    name: 'СУГС Владо Тасевски',
    shortName: 'Владо Тасевски',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-zdravko-cvetkovski',
    name: 'СУГС Здравко Цветковски',
    shortName: 'Здравко Цветковски',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-marija-kiri-sklodovska',
    name: 'СУГС Марија Кири Склодовска',
    shortName: 'Марија Кири',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-shaip-jusuf',
    name: 'СУГС Шаип Јусуф',
    shortName: 'Шаип Јусуф',
    city: 'Скопје',
    type: 'vocational',
  },
  {
    id: 'sugs-arseni-jovkov',
    name: 'СУГС Арсени Јовков',
    shortName: 'Арсени Јовков',
    city: 'Скопје',
    type: 'vocational',
  },

  // Приватни / Меѓународни
  {
    id: 'nova-megjunarodno-uciliste',
    name: 'НОВА Меѓународно Училиште',
    shortName: 'НОВА',
    city: 'Скопје',
    type: 'private',
  },
];

// За идно проширување — само додај нови градови како посебни arrays и комбинирај
// export const BITOLA_SCHOOLS = [...];
// export const PRILEP_SCHOOLS = [...];

export const SCHOOLS = [
  ...SKOPJE_SCHOOLS,
  // ...BITOLA_SCHOOLS,
];

// Помошна функција: групирај училишта по град
export const getSchoolsByCity = () => {
  return SCHOOLS.reduce((acc, school) => {
    if (!acc[school.city]) acc[school.city] = [];
    acc[school.city].push(school);
    return acc;
  }, {});
};

// Помошна функција: најди училиште по ID
export const getSchoolById = (id) => {
  return SCHOOLS.find((s) => s.id === id);
};
