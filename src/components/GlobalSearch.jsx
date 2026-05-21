import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import {
  Search, FileText, Calendar, Clock, File, Activity, BookOpen,
  X, TrendingUp, History, Sparkles, Loader2, ChevronRight
} from 'lucide-react';

export default function GlobalSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches
  useEffect(() => {
    const stored = localStorage.getItem('global_search_recent');
    if (stored) setRecentSearches(JSON.parse(stored).slice(0, 5));
  }, []);

  const saveRecentSearch = useCallback((term) => {
    if (!term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('global_search_recent', JSON.stringify(updated));
  }, [recentSearches]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keyboard navigation inside results
  useEffect(() => {
    if (!open) return;
    const handleNav = (e) => {
      const resultsArray = Object.values(results).flat();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, resultsArray.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      } else if (e.key === 'Enter' && selectedIndex >= 0 && resultsArray[selectedIndex]) {
        e.preventDefault();
        handleResultClick(resultsArray[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [open, results, selectedIndex]);

  // Scroll selected into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedEl = resultsRef.current.querySelector(`.gs-result-item[data-idx="${selectedIndex}"]`);
      selectedEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Search logic
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }
    const search = async () => {
      setLoading(true);
      const term = `%${query}%`;
      const promises = [];

      const highlight = (text) => {
        if (!text) return '';
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
      };

      promises.push(
        supabase.from('notes').select('id, title, body, created_at, section_name')
          .or(`title.ilike.${term},body.ilike.${term}`).eq('user_id', user.id).limit(8)
          .then(({ data }) => (data || []).map(d => ({ ...d, type: 'note', href: '/notes', titleHtml: highlight(d.title), subtitle: `Note · ${d.section_name || 'Uncategorized'}`, icon: FileText })))
      );
      promises.push(
        supabase.from('shifts').select('id, shift_date, shift_type, notes, section_name')
          .or(`notes.ilike.${term},section_name.ilike.${term}`).eq('user_id', user.id).limit(6)
          .then(({ data }) => (data || []).map(d => ({ ...d, type: 'shift', href: '/shifts', titleHtml: highlight(d.section_name || 'Shift'), subtitle: `Shift · ${d.shift_type} · ${new Date(d.shift_date).toLocaleDateString()}`, icon: Clock })))
      );
      promises.push(
        supabase.from('exams').select('id, exam_name, exam_date, notes, section_name')
          .or(`exam_name.ilike.${term},notes.ilike.${term},section_name.ilike.${term}`).eq('user_id', user.id).limit(6)
          .then(({ data }) => (data || []).map(d => ({ ...d, type: 'exam', href: '/shifts', titleHtml: highlight(d.exam_name), subtitle: `Exam · ${d.section_name || 'No section'} · ${new Date(d.exam_date).toLocaleDateString()}`, icon: Calendar })))
      );
      promises.push(
        supabase.from('documents').select('id, file_name, file_type, created_at')
          .ilike('file_name', term).eq('user_id', user.id).limit(6)
          .then(({ data }) => (data || []).map(d => ({ ...d, type: 'document', href: '/documents', titleHtml: highlight(d.file_name), subtitle: `Document · ${d.file_type?.toUpperCase()}`, icon: File })))
      );
      promises.push(
        supabase.from('daily_reports').select('id, procedure_name, notes, log_date, section_name')
          .or(`procedure_name.ilike.${term},notes.ilike.${term},section_name.ilike.${term}`).eq('user_id', user.id).limit(6)
          .then(({ data }) => (data || []).map(d => ({ ...d, type: 'log', href: '/reports', titleHtml: highlight(d.procedure_name), subtitle: `Log · ${d.section_name || 'No section'} · ${new Date(d.log_date).toLocaleDateString()}`, icon: Activity })))
      );
      promises.push(
        supabase.from('procedures').select('id, procedure_name, description, section_name')
          .or(`procedure_name.ilike.${term},description.ilike.${term},section_name.ilike.${term}`).limit(6)
          .then(({ data }) => (data || []).map(d => ({ ...d, type: 'procedure', href: '/rotations', titleHtml: highlight(d.procedure_name), subtitle: `Procedure · ${d.section_name || 'General'}`, icon: BookOpen })))
      );
      promises.push(
        supabase.from('rotations').select('id, section_name, hospital_site, notes')
          .or(`section_name.ilike.${term},hospital_site.ilike.${term},notes.ilike.${term}`).eq('user_id', user.id).limit(6)
          .then(({ data }) => (data || []).map(d => ({ ...d, type: 'rotation', href: '/rotations', titleHtml: highlight(d.section_name), subtitle: `Rotation · ${d.hospital_site || 'No site'}`, icon: Calendar })))
      );

      const allResults = await Promise.all(promises);
      const flat = allResults.flat();
      const grouped = flat.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
      }, {});
      setResults(grouped);
      setLoading(false);
    };
    const timer = setTimeout(search, 250);
    return () => clearTimeout(timer);
  }, [query, user.id]);

  const handleResultClick = (item) => {
    saveRecentSearch(query);
    setOpen(false);
    setQuery('');
    navigate(item.href);
  };

  const handleRecentClick = (term) => {
    setQuery(term);
    inputRef.current?.focus();
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('global_search_recent');
  };

  const getTypeLabel = (type) => ({
    note: 'Notes', shift: 'Shifts', exam: 'Exams', document: 'Documents',
    log: 'Daily Logs', procedure: 'Procedures', rotation: 'Rotations'
  }[type] || type);

  const resultsArray = Object.values(results).flat();

  // Modal content using portal
  const modalContent = open && createPortal(
    <div className="gs-overlay" onClick={() => setOpen(false)}>
      <div className="gs-modal" onClick={e => e.stopPropagation()}>
        <div className="gs-modal-inner">
          <div className="gs-input-wrapper">
            <Search size={18} className="gs-input-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search notes, shifts, exams, documents…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="gs-input"
            />
            {query && (
              <button className="gs-clear" onClick={() => setQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="gs-results" ref={resultsRef}>
            {loading && (
              <div className="gs-state">
                <Loader2 size={24} className="spin" />
                <p>Searching...</p>
              </div>
            )}

            {!loading && query.length >= 2 && Object.keys(results).length === 0 && (
              <div className="gs-state">
                <Sparkles size={24} style={{ color: '#ff8fb1' }} />
                <p>No results for “{query}”</p>
              </div>
            )}

            {!loading && query.length < 2 && (
              <div className="gs-recent">
                <div className="gs-recent-header">
                  <History size={12} />
                  <span>Recent</span>
                  {recentSearches.length > 0 && (
                    <button className="gs-clear-recent" onClick={clearRecent}>Clear</button>
                  )}
                </div>
                {recentSearches.length === 0 ? (
                  <p className="gs-recent-empty">No recent searches</p>
                ) : (
                  <div className="gs-recent-list">
                    {recentSearches.map((term, i) => (
                      <button key={i} className="gs-recent-item" onClick={() => handleRecentClick(term)}>
                        {term}
                      </button>
                    ))}
                  </div>
                )}
                <div className="gs-tip">⌘K to open · ESC to close</div>
              </div>
            )}

            {!loading && query.length >= 2 && Object.keys(results).length > 0 && (
              <div className="gs-grouped">
                {Object.entries(results).map(([type, items]) => (
                  <div key={type} className="gs-group">
                    <div className="gs-group-header">
                      <span className="gs-group-dot" />
                      <span>{getTypeLabel(type)}</span>
                      <span className="gs-group-count">{items.length}</span>
                    </div>
                    {items.map((item, idx) => {
                      const globalIdx = resultsArray.findIndex(r => r.id === item.id);
                      const IconComp = item.icon;
                      return (
                        <button
                          key={item.id}
                          data-idx={globalIdx}
                          className={`gs-result-item ${selectedIndex === globalIdx ? 'selected' : ''}`}
                          onClick={() => handleResultClick(item)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                        >
                          <div className="gs-result-icon">
                            <IconComp size={14} />
                          </div>
                          <div className="gs-result-details">
                            <div className="gs-result-title" dangerouslySetInnerHTML={{ __html: item.titleHtml }} />
                            <div className="gs-result-subtitle">{item.subtitle}</div>
                          </div>
                          <ChevronRight size={14} className="gs-arrow" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button className="gs-trigger" onClick={() => setOpen(true)} title="Search (⌘K)">
        <Search size={16} />
        <span className="gs-trigger-text">Search…</span>
        <kbd>⌘K</kbd>
      </button>

      {modalContent}

      <style>{`
        /* Trigger button – matches theme */
        .gs-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,200,220,0.5);
          border-radius: 40px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .gs-trigger:hover {
          border-color: #ff8fb1;
          background: white;
          color: #ff5d8f;
        }
        .gs-trigger kbd {
          background: rgba(0,0,0,0.05);
          border-radius: 6px;
          padding: 2px 5px;
          font-size: 11px;
          color: #aaa;
          margin-left: 4px;
        }
        @media (max-width: 640px) {
          .gs-trigger-text { display: none; }
          .gs-trigger kbd { display: none; }
          .gs-trigger { padding: 8px; border-radius: 40px; }
        }

        /* Overlay – full screen, highest z-index */
        .gs-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          backdrop-filter: blur(12px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        /* Modal */
        .gs-modal {
          width: 100%;
          max-width: 640px;
          background: white;
          border-radius: 28px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,200,220,0.4);
          overflow: hidden;
          animation: slideUp 0.25s ease;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .gs-modal-inner {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* Input wrapper */
        .gs-input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid #ffe0ea;
          flex-shrink: 0;
        }
        .gs-input-icon {
          color: #ff6f91;
          flex-shrink: 0;
        }
        .gs-input {
          flex: 1;
          border: none;
          font-size: 16px;
          padding: 8px 0;
          outline: none;
          font-family: 'DM Sans', sans-serif;
          background: transparent;
          color: #1c1412;
        }
        .gs-input::placeholder {
          color: #ccc;
        }
        .gs-clear {
          background: none;
          border: none;
          cursor: pointer;
          color: #bbb;
          padding: 4px;
          border-radius: 8px;
          display: flex;
        }
        .gs-clear:hover {
          background: #f0f0f0;
        }

        /* Results area – scrollable */
        .gs-results {
          overflow-y: auto;
          background: linear-gradient(180deg, #fff8fb 0%, #ffffff 100%);
          flex: 1;
          min-height: 0;
        }
        .gs-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 48px 24px;
          text-align: center;
          color: #bbb;
          font-size: 14px;
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Recent */
        .gs-recent {
          padding: 16px 20px;
        }
        .gs-recent-header {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: #bbb;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }
        .gs-clear-recent {
          margin-left: auto;
          background: none;
          border: none;
          color: #ff8fb1;
          font-size: 11px;
          cursor: pointer;
        }
        .gs-recent-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .gs-recent-item {
          background: #fff0f4;
          border: none;
          border-radius: 40px;
          padding: 6px 14px;
          font-size: 13px;
          color: #ff5d8f;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: 0.2s;
        }
        .gs-recent-item:hover {
          background: #ffe4ec;
        }
        .gs-tip {
          font-size: 11px;
          color: #ccc;
          text-align: center;
          padding-top: 8px;
          border-top: 1px solid #ffe0ea;
        }

        /* Grouped results */
        .gs-grouped {
          padding: 12px 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .gs-group-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #aaa;
          letter-spacing: 0.05em;
          padding-bottom: 4px;
          border-bottom: 1px solid #ffe0ea;
        }
        .gs-group-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff6f91;
        }
        .gs-group-count {
          margin-left: auto;
          background: #f5f0f2;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }
        .gs-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 12px;
          border: none;
          background: transparent;
          cursor: pointer;
          text-align: left;
          border-radius: 14px;
          transition: background 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .gs-result-item.selected,
        .gs-result-item:hover {
          background: #fff8fa;
        }
        .gs-result-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #fff0f4;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ff6f91;
          flex-shrink: 0;
        }
        .gs-result-details {
          flex: 1;
          min-width: 0;
        }
        .gs-result-title {
          font-size: 14px;
          font-weight: 600;
          color: #1c1412;
          margin-bottom: 2px;
        }
        .gs-result-title mark {
          background: rgba(255,111,145,0.2);
          border-radius: 4px;
          padding: 0 2px;
          color: #e05555;
        }
        .gs-result-subtitle {
          font-size: 11px;
          color: #bbb;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .gs-arrow {
          color: #ddd;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .gs-result-item:hover .gs-arrow {
          transform: translateX(3px);
          color: #ff6f91;
        }

        @media (max-width: 640px) {
          .gs-overlay {
            padding: 12px;
          }
          .gs-modal {
            max-height: 90vh;
            border-radius: 20px;
          }
          .gs-input-wrapper {
            padding: 12px 16px;
          }
          .gs-input {
            font-size: 15px;
          }
          .gs-grouped {
            padding: 10px 12px;
          }
          .gs-result-item {
            padding: 10px 10px;
          }
        }
      `}</style>
    </>
  );
}