import { SCHOOLS } from './schools';

export const TOPIC_FORUMS = [
  {
    id: 'general',
    name: 'Општо',
    description: 'Општи дискусии за сè и сешто',
    icon: '💬',
    color: '#6366f1',
  },
  {
    id: 'drzavna-matura',
    name: 'Државна матура',
    description: 'Подготовка, литература, искуства од матура',
    icon: '🎓',
    color: '#dc2626',
  },
  {
    id: 'pomos-pri-ucenje',
    name: 'Помош при учење',
    description: 'Заедничко учење, прашања, објаснувања',
    icon: '📚',
    color: '#0891b2',
  },
  {
    id: 'vestachka-inteligencija',
    name: 'Вештачка интелигенција',
    description: 'AI алатки, новости, дискусии',
    icon: '🤖',
    color: '#7c3aed',
  },
  {
    id: 'fakulteti',
    name: 'Факултети',
    description: 'Избор на факултет, искуства, рангирање',
    icon: '🏛️',
    color: '#059669',
  },
  {
    id: 'strani-jazici',
    name: 'Странски јазици',
    description: 'Англиски, германски, IELTS, TOEFL, Goethe',
    icon: '🌍',
    color: '#ea580c',
  },
  {
    id: 'karierno-vodenje',
    name: 'Кариерно водење',
    description: 'Професии, пракси, прв хонорар',
    icon: '💼',
    color: '#0284c7',
  },
  {
    id: 'studii-vo-stranstvo',
    name: 'Студии во странство',
    description: 'Апликации за факултети надвор, скаут програми',
    icon: '✈️',
    color: '#0d9488',
  },
  {
    id: 'mentalno-zdravje',
    name: 'Ментално здравје',
    description: 'Стрес, испити, баланс — простор без осуда',
    icon: '🧠',
    color: '#db2777',
  },
  {
    id: 'vannastavni-aktivnosti',
    name: 'Вон-наставни активности',
    description: 'Спорт, музика, дебата, волонтерство',
    icon: '🎭',
    color: '#9333ea',
  },
  {
    id: 'tehnologija-i-programiranje',
    name: 'Технологија и програмирање',
    description: 'Кодирање, проекти, алатки',
    icon: '💻',
    color: '#1e40af',
  },
  {
    id: 'zabava-i-kultura',
    name: 'Забава и култура',
    description: 'Филмови, книги, музика, серии',
    icon: '🎬',
    color: '#be185d',
  },
  {
    id: 'sport',
    name: 'Спорт',
    description: 'Спорт, фитнес, рекреација',
    icon: '⚽',
    color: '#16a34a',
  },
  {
    id: 'socijalni-prasanja',
    name: 'Социјални прашања',
    description: 'Теми важни за младите (екологија, општество)',
    icon: '🌱',
    color: '#65a30d',
  },
  {
    id: 'pretstavi-se',
    name: 'Претстави се',
    description: 'Нови членови се претставуваат',
    icon: '👋',
    color: '#f59e0b',
  },
  {
    id: 'off-topic',
    name: 'Off-Topic',
    description: 'Слободни разговори, шеги, меми',
    icon: '🎲',
    color: '#737373',
  },
];

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

export const ALL_FORUMS = [
  ...TOPIC_FORUMS.map((f) => ({ ...f, type: 'topic' })),
  ...SCHOOLS.map(schoolToForum),
];

export const getForumById = (id) => ALL_FORUMS.find((f) => f.id === id);
