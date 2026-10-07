import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  ArrowUpRight,
  Loader2,
  FileText,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  Microscope,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';
import Dialog from './ui/Dialog';
const sources = [
  {
    table: 'notes',
    fields: ['title', 'body'],
    title: 'title',
    label: 'Note',
    route: '/notes',
    icon: FileText,
  },
  {
    table: 'shifts',
    fields: ['section_name', 'notes'],
    title: 'section_name',
    label: 'Shift',
    route: '/shifts',
    icon: CalendarDays,
  },
  {
    table: 'exams',
    fields: ['exam_name', 'notes'],
    title: 'exam_name',
    label: 'Exam',
    route: '/shifts',
    icon: CalendarDays,
  },
  {
    table: 'daily_reports',
    fields: ['procedure_name', 'notes'],
    title: 'procedure_name',
    label: 'Report',
    route: '/reports',
    icon: ClipboardList,
  },
  {
    table: 'documents',
    fields: ['file_name'],
    title: 'file_name',
    label: 'Document',
    route: '/documents',
    icon: FolderOpen,
  },
  {
    table: 'rotations',
    fields: ['section_name', 'hospital_site'],
    title: 'section_name',
    label: 'Rotation',
    route: '/rotations',
    icon: Microscope,
  },
];
export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  const storageKey = 'medtech-search-' + user.id;
  const [recent, setRecent] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(value) ? value.slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    const keydown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, []);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    let active = true;
    setError('');
    setResults([]);
    const cleaned = query.trim().replace(/[(),.%"\\]/g, ' ');
    if (!open || cleaned.length < 2) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const term = '%' + cleaned + '%';
        const responses = await Promise.all(
          sources.map(async (source) => {
            let request = supabase.from(source.table).select('*').eq('user_id', user.id);
            request =
              source.fields.length === 1
                ? request.ilike(source.fields[0], term)
                : request.or(source.fields.map((field) => field + '.ilike.' + term).join(','));
            const { data, error } = await request.limit(6);
            if (error) throw error;
            return (data || []).map((row) => ({
              id: source.table + '-' + row.id,
              title: row[source.title] || source.label,
              subtitle: source.label + (row.section_name ? ' · ' + row.section_name : ''),
              to:
                source.route +
                (source.table === 'notes' ? '?note=' + encodeURIComponent(row.id) : ''),
              state: source.table === 'exams' ? { tab: 'exams' } : undefined,
              icon: source.icon,
            }));
          }),
        );
        if (active) setResults(responses.flat());
      } catch {
        if (active) setError('Search couldn’t finish. Check your connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, open, user.id]);
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);
  function choose(result) {
    const value = query.trim();
    const next = [value, ...recent.filter((item) => item !== value)].filter(Boolean).slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* session-only history */
    }
    close();
    navigate(result.to, { state: result.state });
  }
  return (
    <>
      <button
        className="workspace-search-trigger"
        onClick={() => setOpen(true)}
        aria-label="Search your workspace"
      >
        <Search size={17} />
        <span>Search your workspace</span>
        <kbd>Ctrl K</kbd>
      </button>
      {open && (
        <Dialog onClose={close} label="Search your workspace">
          <div className="workspace-search-dialog">
            <div className="workspace-search-field">
              <Search size={20} />
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a note, shift, report…"
                aria-label="Search your workspace"
              />
              <button className="icon-button" onClick={close} aria-label="Close search">
                <X size={18} />
              </button>
            </div>
            <div className="workspace-search-results" aria-live="polite">
              {loading ? (
                <p className="search-status">
                  <Loader2 size={20} className="spin" />
                  Finding your little things…
                </p>
              ) : error ? (
                <p className="search-status" role="alert">
                  {error}
                </p>
              ) : query.trim().length >= 2 ? (
                results.length ? (
                  results.map(({ icon: Icon, ...result }) => (
                    <button key={result.id} onClick={() => choose(result)}>
                      <span className="stat-icon rose">
                        <Icon size={18} />
                      </span>
                      <span>
                        <strong>{result.title}</strong>
                        <small>{result.subtitle}</small>
                      </span>
                      <ArrowUpRight size={15} />
                    </button>
                  ))
                ) : (
                  <p className="search-status">No results for “{query}”. Try another word.</p>
                )
              ) : (
                <div className="search-recents">
                  <p className="eyebrow">RECENT SEARCHES</p>
                  {recent.length ? (
                    recent.map((value) => (
                      <button key={value} onClick={() => setQuery(value)}>
                        <Search size={14} />
                        {value}
                        <ArrowUpRight size={13} />
                      </button>
                    ))
                  ) : (
                    <p>Your notes, reports, rotations, and schedule—all in one search.</p>
                  )}
                </div>
              )}
            </div>
            <div className="workspace-search-footer">
              <span>Tab to browse · Enter to open</span>
              <span>Esc to close</span>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
