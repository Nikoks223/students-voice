import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TOPIC_FORUMS } from '../data/forums';
import { getSchoolsByCity } from '../data/schools';
import { fetchTopicForums, fetchSchoolForums } from '../lib/firestore/forums';
import ForumIcon from './ForumIcon';
import MaturaCountdown from './MaturaCountdown';

function sortForumsByActivity(forums) {
  return [...forums].sort((a, b) => {
    const aTime = a.lastActivityAt?.toMillis?.() || a.lastActivityAt?.seconds * 1000 || 0;
    const bTime = b.lastActivityAt?.toMillis?.() || b.lastActivityAt?.seconds * 1000 || 0;
    if (aTime && bTime) return bTime - aTime;
    if (aTime) return -1;
    if (bTime) return 1;
    return a.name.localeCompare(b.name, 'mk');
  });
}

// Static fallbacks — shown instantly while Firestore loads
const STATIC_TOPIC_FORUMS = sortForumsByActivity(TOPIC_FORUMS);

const STATIC_SCHOOLS_BY_CITY = (() => {
  const grouped = getSchoolsByCity();
  Object.values(grouped).forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'mk')));
  return grouped;
})();

function SectionLabel({ children }) {
  return (
    <p className="px-2 mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted">
      {children}
    </p>
  );
}

function NavItem({ to, end = false, icon, children, onLinkClick }) {
  return (
    <NavLink to={to} end={end} onClick={onLinkClick}>
      {({ isActive }) => (
        <span
          className={`relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-200 ${
            isActive ? 'text-accent bg-accent-soft' : 'text-ink-dim hover:text-ink hover:bg-surface'
          }`}
        >
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-full bg-accent" />
          )}
          <span className={`shrink-0 transition-colors ${isActive ? 'text-accent' : 'text-muted'}`}>
            {icon}
          </span>
          {children}
        </span>
      )}
    </NavLink>
  );
}

function ForumItem({ to, icon, color, children, onLinkClick }) {
  return (
    <NavLink to={to} onClick={onLinkClick}>
      {({ isActive }) => (
        <span
          className={`flex items-center gap-2 px-2.5 py-[6px] rounded-lg text-[12.5px] transition-all duration-200 ${
            isActive
              ? 'text-accent font-semibold bg-accent-soft'
              : 'text-ink-dim hover:text-ink hover:bg-surface'
          }`}
        >
          <ForumIcon icon={icon} color={color} size="sm" />
          <span className="truncate">{children}</span>
        </span>
      )}
    </NavLink>
  );
}

function SchoolItem({ to, children, onLinkClick }) {
  return (
    <NavLink to={to} onClick={onLinkClick}>
      {({ isActive }) => (
        <span
          className={`flex items-center gap-2 px-2.5 py-[6px] rounded-lg text-[12.5px] transition-all duration-200 ${
            isActive
              ? 'text-accent font-semibold bg-accent-soft'
              : 'text-ink-dim hover:text-ink hover:bg-surface'
          }`}
        >
          <span
            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
            style={{ background: 'var(--school-icon-bg)' }}
          >
            <svg
              className="w-2.5 h-2.5 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
              />
            </svg>
          </span>
          <span className="truncate">{children}</span>
        </span>
      )}
    </NavLink>
  );
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}
function RecentIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}
function SearchNavIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function SuggestIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function TrophyNavIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6 9H3V6h3m15 3h-3V6h3M6 9c0 4 2 7 6 8.5C16 16 18 13 18 9V3H6v6z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 22h6M12 17v5" />
    </svg>
  );
}

export default function SidebarContent({ onLinkClick = () => {} }) {
  const { isAuthenticated } = useAuth();

  // Start with static data; silently replace with live Firestore data
  const [topicForums, setTopicForums] = useState(STATIC_TOPIC_FORUMS);
  const [schoolsByCity, setSchoolsByCity] = useState(null); // null = use static

  useEffect(() => {
    fetchTopicForums()
      .then((forums) => {
        if (forums.length > 0) {
          setTopicForums(sortForumsByActivity(forums));
        }
      })
      .catch(() => {}); // keep static fallback on error

    fetchSchoolForums()
      .then((grouped) => {
        if (Object.keys(grouped).length > 0) setSchoolsByCity(grouped);
      })
      .catch(() => {}); // keep static fallback on error
  }, []);

  // For schools: use live data if available, fall back to static shape
  const resolvedSchools =
    schoolsByCity ??
    Object.fromEntries(
      Object.entries(STATIC_SCHOOLS_BY_CITY).map(([city, schools]) => [
        city,
        schools.map((s) => ({ id: `school-${s.id}`, name: s.shortName || s.name })),
      ]),
    );

  return (
    <div className="space-y-5 pb-8">
      {/* ── Main nav ── */}
      <nav className="space-y-0.5">
        <NavItem to="/" end icon={<HomeIcon />} onLinkClick={onLinkClick}>
          Почетна
        </NavItem>
        <NavItem to="/recent" icon={<RecentIcon />} onLinkClick={onLinkClick}>
          Скорешни
        </NavItem>
        <NavItem to="/search" icon={<SearchNavIcon />} onLinkClick={onLinkClick}>
          Пребарај
        </NavItem>
        {isAuthenticated && (
          <NavItem to="/new" icon={<PlusIcon />} onLinkClick={onLinkClick}>
            Нова дискусија
          </NavItem>
        )}
        {isAuthenticated && (
          <NavItem to="/suggest-forum" icon={<SuggestIcon />} onLinkClick={onLinkClick}>
            Предложи форум
          </NavItem>
        )}

        <NavItem to="/leaderboard" icon={<TrophyNavIcon />} onLinkClick={onLinkClick}>
          Топ Училишта
        </NavItem>
      </nav>

      <div className="h-px bg-border mx-2" />

      <MaturaCountdown onLinkClick={onLinkClick} />

      {/* ── Topic forums ── */}
      <div>
        <SectionLabel>Теми</SectionLabel>
        <div className="space-y-0.5">
          {topicForums.map((forum) => (
            <ForumItem
              key={forum.id}
              to={`/p/${forum.id}`}
              icon={forum.icon}
              color={forum.color}
              onLinkClick={onLinkClick}
            >
              {forum.name}
            </ForumItem>
          ))}
        </div>
      </div>

      <div className="h-px bg-border mx-2" />

      {/* ── Schools ── */}
      <div>
        <SectionLabel>Училишта</SectionLabel>
        <div className="space-y-4">
          {Object.entries(resolvedSchools).map(([city, schools]) => (
            <div key={city}>
              <p
                className="px-2 mb-1 text-[9px] font-medium uppercase tracking-wider"
                style={{ color: 'var(--color-muted-dim)' }}
              >
                {city}
              </p>
              <div className="space-y-0.5">
                {schools.map((school) => (
                  <SchoolItem key={school.id} to={`/p/${school.id}`} onLinkClick={onLinkClick}>
                    {school.name}
                  </SchoolItem>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
