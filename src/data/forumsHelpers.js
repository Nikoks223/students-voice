// =============================================================================
// SCHEMA ЗАБЕЛЕШКИ — колекција `users` (Firestore)
// =============================================================================
// Поле: year
//   Тип:        number (integer)
//   Вредности:  1 | 2 | 3 | 4
//   Задолжително: ДА — не смее да биде null или undefined
//   Промена (2026-05-20): претходно беше опционално (year | null),
//   сега е задолжително и секогаш е parseInt() вредност.
//   При data validation, отфрли секој user документ каде year не е во [1,2,3,4].
// =============================================================================

import { TOPIC_FORUMS } from './forums';
import { SCHOOLS } from './schools';

// Конвертирај училиште во форум-формат
const schoolToForum = (school) => ({
  id: `school-${school.id}`,
  name: school.name,
  shortName: school.shortName,
  description: `Форум за учениците од ${school.name}`,
  icon: '🏫',
  color: '#475569',
  type: 'school',
  city: school.city,
});

// Сите форуми (topic + school) за seeding во Firestore
export const ALL_FORUMS = [
  ...TOPIC_FORUMS.map((f) => ({ ...f, type: 'topic' })),
  ...SCHOOLS.map(schoolToForum),
];

// Помошна функција: најди форум по ID
export const getForumById = (id) => {
  return ALL_FORUMS.find((f) => f.id === id);
};
