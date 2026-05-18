import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  Upload, FileText, Presentation, Trash2,
  Eye, X, AlertCircle, Search, Loader2,
  File, RefreshCw, HardDrive,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const MAX_FILE_MB  = 50;
const CAP_MB       = 200;
const CAP_BYTES    = CAP_MB  * 1024 * 1024;
const MAX_BYTES    = MAX_FILE_MB * 1024 * 1024;
const ACCEPT       = '.pdf,.doc,.docx,.ppt,.pptx';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf')                return 'pdf';
  if (['docx','doc'].includes(ext)) return 'docx';
  if (['pptx','ppt'].includes(ext)) return 'pptx';
  return 'other';
}

function normalizeFileName(name) {
  return name
    .replace(/\s+/g, '_')
    .replace(/%20/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getFileMeta(type) {
  return {
    pdf:  { label: 'PDF',  color: '#e05555', bg: '#fff0f0', Icon: FileText     },
    docx: { label: 'DOCX', color: '#5f8dff', bg: '#eff4ff', Icon: FileText     },
    pptx: { label: 'PPTX', color: '#ff8c5a', bg: '#fff5ee', Icon: Presentation },
    other:{ label: 'File', color: '#aaa',    bg: '#f5f5f5', Icon: File         },
  }[type] ?? { label: 'File', color: '#aaa', bg: '#f5f5f5', Icon: File };
}

function fmtSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getViewerUrl(url, type) {
  if (type === 'pdf') return url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

/* Usage level: 'ok' | 'warn' | 'critical' | 'full' */
function getUsageLevel(pct) {
  if (pct >= 100) return 'full';
  if (pct >= 90)  return 'critical';
  if (pct >= 75)  return 'warn';
  return 'ok';
}

const USAGE_COLORS = {
  ok:       { bar: 'linear-gradient(90deg,#ff8fb1,#ff6f91)', text: '#ff6f91',  icon: '#ff6f91'  },
  warn:     { bar: 'linear-gradient(90deg,#ffb37a,#ff8c5a)', text: '#ff8c5a',  icon: '#ff8c5a'  },
  critical: { bar: 'linear-gradient(90deg,#ff8f8f,#e05555)', text: '#e05555',  icon: '#e05555'  },
  full:     { bar: 'linear-gradient(90deg,#ff8f8f,#e05555)', text: '#e05555',  icon: '#e05555'  },
};

/* ─────────────────────────────────────────────
   STORAGE USAGE BAR
───────────────────────────────────────────── */
function StorageBar({ usedBytes }) {
  const pct    = Math.min(100, Math.round((usedBytes / CAP_BYTES) * 100));
  const level  = getUsageLevel(pct);
  const colors = USAGE_COLORS[level];
  const freeBytes = Math.max(0, CAP_BYTES - usedBytes);

  return (
    <div className="sb-card">
      <div className="sb-top">
        <div className="sb-left">
          <HardDrive size={16} style={{ color: colors.icon, flexShrink: 0 }} />
          <span className="sb-label">Storage</span>
        </div>
        <span className="sb-numbers">
          {fmtSize(usedBytes)}
          <span className="sb-cap"> of {CAP_MB} MB</span>
        </span>
      </div>

      <div className="sb-track">
        <div
          className="sb-fill"
          style={{ width: `${pct}%`, background: colors.bar }}
        />
      </div>

      <div className="sb-bottom">
        <span className="sb-pct" style={{ color: level === 'ok' ? '#bbb' : colors.text, fontWeight: level !== 'ok' ? 600 : 400 }}>
          {level === 'full'     ? '🚫 Storage full — delete files to upload more'     :
           level === 'critical' ? `⚠️ ${pct}% used — almost full!`                    :
           level === 'warn'     ? `${pct}% used`                                       :
           `${pct}% used`}
        </span>
        {level !== 'full' && (
          <span className="sb-free">{fmtSize(freeBytes)} free</span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FILE VIEWER MODAL
───────────────────────────────────────────── */
function FileViewer({ doc, onClose }) {
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);
  const meta = getFileMeta(doc.file_type);
  const src  = getViewerUrl(doc.file_url, doc.file_type);

  return (
    <div className="dv-overlay" onClick={onClose}>
      <div className="dv-modal" onClick={e => e.stopPropagation()}>
        <div className="dv-header">
          <div className="dv-header-left">
            <span className="dv-type-badge" style={{ background: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
            <h3 className="dv-filename">{doc.file_name}</h3>
          </div>
          <div className="dv-header-right">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="dv-open-btn"
              download={doc.file_name}
            >
              ↗ Open original
            </a>
            <button className="dv-close-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="dv-body">
          {loading && !failed && (
            <div className="dv-loading">
              <Loader2 size={28} className="spin" />
              <p>Loading document…</p>
            </div>
          )}
          {failed ? (
            <div className="dv-failed">
              <AlertCircle size={32} style={{ color: '#ff8c5a', marginBottom: 12 }} />
              <p className="dv-failed-title">Preview unavailable</p>
              <p className="dv-failed-hint">This file can't be previewed here.</p>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="dv-download-btn">
                ↗ Open file in new tab
              </a>
            </div>
          ) : (
            <iframe
              src={src}
              className="dv-iframe"
              title={doc.file_name}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setFailed(true); }}
              style={{ opacity: loading ? 0 : 1 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FILE CARD
───────────────────────────────────────────── */
function FileCard({ doc, onView, onDelete, deleting }) {
  const meta = getFileMeta(doc.file_type);
  const { Icon } = meta;

  return (
    <div className="dc-card">
      <div className="dc-card-icon-wrap" style={{ background: meta.bg }}>
        <Icon size={28} style={{ color: meta.color }} />
        <span className="dc-type-chip" style={{ background: meta.color }}>{meta.label}</span>
      </div>
      <div className="dc-card-info">
        <p className="dc-card-name" title={doc.file_name}>{doc.file_name}</p>
        <p className="dc-card-meta">{fmtSize(doc.file_size)} · {fmtDate(doc.created_at)}</p>
      </div>
      <div className="dc-card-actions">
        <a
          className="dc-original-btn"
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open original
        </a>
        <button
          className="dc-view-btn"
          style={{ background: meta.color }}
          onClick={() => onView(doc)}
        >
          <Eye size={14} /> View
        </button>
        <button
          className="dc-delete-btn"
          onClick={() => onDelete(doc)}
          disabled={deleting}
          title="Delete file"
        >
          {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   UPLOAD ZONE
───────────────────────────────────────────── */
function UploadZone({ onUpload, uploading, progress, isFull, usedBytes }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = (files) => {
    const file = files[0];
    if (!file) return;
    const type = getFileType(file.name);
    if (type === 'other') {
      alert('Only PDF, DOCX, and PPTX files are supported.');
      return;
    }
    if (file.size > MAX_BYTES) {
      alert(`File must be under ${MAX_FILE_MB} MB.`);
      return;
    }
    if (usedBytes + file.size > CAP_BYTES) {
      alert(`Not enough space. This file (${fmtSize(file.size)}) would exceed your ${CAP_MB} MB limit. Free up space by deleting files first.`);
      return;
    }
    onUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!isFull) handleFiles(e.dataTransfer.files);
  };

  /* ── FULL state ── */
  if (isFull) {
    return (
      <div className="uz-zone uz-full">
        <div className="uz-full-icon">
          <HardDrive size={24} style={{ color: '#e05555' }} />
        </div>
        <p className="uz-full-title">Storage full</p>
        <p className="uz-full-hint">
          You've used all {CAP_MB} MB of your storage.<br />
          Delete existing files to upload new ones.
        </p>
      </div>
    );
  }

  /* ── UPLOADING state ── */
  if (uploading) {
    return (
      <div className="uz-zone uz-uploading-state">
        <Loader2 size={26} className="spin" style={{ color: '#ff6f91' }} />
        <p className="uz-uploading-text">Uploading… {progress}%</p>
        <div className="uz-progress-track">
          <div className="uz-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  }

  /* ── DEFAULT state ── */
  return (
    <div
      className={`uz-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
      <div className="uz-icon-wrap">
        <Upload size={22} style={{ color: '#ff6f91' }} />
      </div>
      <p className="uz-title">
        {dragging ? 'Drop file here' : 'Upload a document'}
      </p>
      <p className="uz-hint">PDF, DOCX, or PPTX · Max {MAX_FILE_MB} MB per file</p>
      <button className="uz-browse-btn" type="button">Browse files</button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function DocumentsPage() {
  const { user } = useAuth();

  const [docs,        setDocs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [viewingDoc,  setViewingDoc]  = useState(null);
  const [deletingId,  setDeletingId]  = useState(null);
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('all');

  /* ── Derived: total used bytes ── */
  const usedBytes = useMemo(
    () => docs.reduce((sum, d) => sum + (d.file_size ?? 0), 0),
    [docs]
  );
  const isFull = usedBytes >= CAP_BYTES;

  /* ── Fetch ── */
  const fetchDocs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error) setDocs(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { if (user?.id) fetchDocs(); }, [fetchDocs, user?.id]);

  /* ── Upload ── */
  const handleUpload = async (file) => {
    setUploading(true);
    setProgress(0);
    setUploadError('');

    try {
      const type     = getFileType(file.name);
      const safeName = file.name.replace(/\s+/g, '_');
      const path     = `${user.id}/${Date.now()}_${safeName}`;

      const interval = setInterval(() => {
        setProgress(p => Math.min(p + 15, 85));
      }, 300);

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type, upsert: false });

      clearInterval(interval);
      if (uploadErr) throw uploadErr;

      setProgress(95);

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      const { error: dbErr } = await supabase
        .from('documents')
        .insert([{
          user_id:      user.id,
          file_name:    file.name,
          file_url:     urlData.publicUrl,
          storage_path: path,
          file_type:    type,
          file_size:    file.size,
        }]);

      if (dbErr) throw dbErr;
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
      await fetchDocs();
    } catch (err) {
      setUploadError(err.message ?? 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
    setDeletingId(doc.id);
    try {
      await supabase.storage.from('documents').remove([doc.storage_path]);
      await supabase.from('documents').delete().eq('id', doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      if (viewingDoc?.id === doc.id) setViewingDoc(null);
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Filter ── */
  const filtered = docs
    .filter(d => filterType === 'all' || d.file_type === filterType)
    .filter(d => !search || d.file_name.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all:  docs.length,
    pdf:  docs.filter(d => d.file_type === 'pdf').length,
    docx: docs.filter(d => d.file_type === 'docx').length,
    pptx: docs.filter(d => d.file_type === 'pptx').length,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,600;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        /* ── Page ── */
        .dp-page {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
          font-family: 'DM Sans', sans-serif;
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,220,232,0.55);
          border-radius: 28px;
          box-shadow: 0 2px 12px rgba(255,111,145,0.05), 0 6px 28px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          padding: 28px;
        }
        .dp-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 5vw, 2.55rem);
          font-weight: 700;
          color: #1c1012;
          margin: 0 0 6px;
          line-height: 1.08;
          letter-spacing: 0;
        }
        .dp-title-accent { color: #ff5d8f; font-style: italic; }
        .dp-subtitle { font-size: 13px; color: #bbb; margin: 0; }

        /* ── Storage bar ── */
        .sb-card {
          background: rgba(255,255,255,0.88);
          border: 1.5px solid #ffe0ea;
          border-radius: 20px;
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sb-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .sb-left { display: flex; align-items: center; gap: 8px; }
        .sb-label { font-size: 14px; font-weight: 600; color: #444; }
        .sb-numbers { font-size: 13px; color: #555; font-weight: 600; }
        .sb-cap { color: #bbb; font-weight: 400; }
        .sb-track {
          height: 8px;
          background: #f3dbe3;
          border-radius: 999px;
          overflow: hidden;
        }
        .sb-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
        }
        .sb-bottom { display: flex; justify-content: space-between; align-items: center; }
        .sb-pct  { font-size: 12px; color: #bbb; }
        .sb-free { font-size: 12px; color: #bbb; }

        /* ── Upload zone ── */
        .uz-zone {
          border: 2px dashed #ffd6e1;
          border-radius: 26px;
          background: rgba(255,255,255,0.8);
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .uz-zone:hover,
        .uz-zone.dragging {
          border-color: #ff8fb1;
          background: rgba(255,240,247,0.9);
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(255,111,145,0.12);
        }
        .uz-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 18px;
          background: linear-gradient(135deg, #fff0f4, #ffd6e1);
          display: flex; align-items: center; justify-content: center;
        }
        .uz-title  { font-size: 15px; font-weight: 700; color: #333; margin: 0; }
        .uz-hint   { font-size: 12px; color: #bbb; margin: 0; }
        .uz-browse-btn {
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white; border: none; border-radius: 999px;
          padding: 10px 22px; font-size: 13px; font-weight: 600;
          cursor: pointer; margin-top: 4px; transition: 0.2s; font-family: inherit;
        }
        .uz-browse-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.3); }

        /* ── Full state ── */
        .uz-full {
          border-color: #ffd0d0;
          background: #fff8f8;
          cursor: default;
        }
        .uz-full:hover { transform: none; box-shadow: none; }
        .uz-full-icon {
          width: 52px; height: 52px;
          border-radius: 18px;
          background: #fff0f0;
          display: flex; align-items: center; justify-content: center;
        }
        .uz-full-title { font-size: 15px; font-weight: 700; color: #e05555; margin: 0; }
        .uz-full-hint  { font-size: 13px; color: #cc8080; margin: 0; line-height: 1.6; }

        /* ── Uploading state ── */
        .uz-uploading-state { cursor: default; pointer-events: none; }
        .uz-uploading-text { font-size: 14px; font-weight: 600; color: #ff6f91; margin: 0; }
        .uz-progress-track {
          width: 100%; max-width: 260px; height: 6px;
          background: #ffd6e1; border-radius: 999px; overflow: hidden;
        }
        .uz-progress-fill {
          height: 100%; border-radius: 999px;
          background: linear-gradient(90deg, #ff8fb1, #ff6f91);
          transition: width 0.3s ease;
        }

        /* ── Upload error ── */
        .dp-upload-error {
          display: flex; align-items: center; gap: 10px;
          background: #fff0f0; color: #c0392b;
          border: 1px solid #ffd0d0; border-radius: 16px;
          padding: 12px 16px; font-size: 13px;
        }

        /* ── Toolbar ── */
        .dp-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .dp-search-wrap { flex: 1; min-width: 180px; position: relative; display: flex; align-items: center; }
        .dp-search-icon { position: absolute; left: 13px; color: #ccc; pointer-events: none; }
        .dp-search {
          width: 100%; border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 16px 10px 36px;
          font-size: 13px; outline: none; transition: 0.2s; color: #444; font-family: inherit;
        }
        .dp-search:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .dp-refresh-btn {
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 14px;
          cursor: pointer; display: flex; align-items: center;
          color: #bbb; transition: 0.2s;
        }
        .dp-refresh-btn:hover { border-color: #ff8fb1; color: #ff5d8f; }

        /* ── Filter tabs ── */
        .dp-filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
        .dp-tab {
          padding: 7px 16px; border-radius: 999px; border: 1.5px solid #ffe0ea;
          background: rgba(255,255,255,0.85); font-size: 12px; font-weight: 600; color: #bbb;
          cursor: pointer; transition: 0.2s; white-space: nowrap; font-family: inherit;
        }
        .dp-tab:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .dp-tab.active {
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          border-color: transparent; color: white;
          box-shadow: 0 4px 12px rgba(255,111,145,0.25);
        }
        .dp-preview-note {
          font-size: 12px; color: #b97093; margin: 0 0 10px;
          max-width: 720px;
        }
        .dp-tab-count {
          display: inline-block; background: rgba(255,255,255,0.28);
          border-radius: 999px; padding: 0 6px; font-size: 10px; margin-left: 3px;
        }
        .dp-tab:not(.active) .dp-tab-count { background: #fff0f4; color: #ff8fb1; }

        /* ── File grid ── */
        .dp-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }

        /* ── File card ── */
        .dc-card {
          background: rgba(255,255,255,0.92); border-radius: 22px;
          border: 1.5px solid rgba(255,220,210,0.55);
          padding: 18px; display: flex; flex-direction: column; gap: 12px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .dc-card:hover { box-shadow: 0 8px 26px rgba(255,111,145,0.1); transform: translateY(-2px); }
        .dc-card-icon-wrap {
          width: 100%; height: 90px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center; position: relative;
        }
        .dc-type-chip {
          position: absolute; top: 8px; right: 8px; color: white;
          font-size: 10px; font-weight: 700; border-radius: 999px; padding: 3px 8px;
        }
        .dc-card-name {
          font-size: 13px; font-weight: 700; color: #1c1412; margin: 0 0 5px; line-height: 1.4;
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word;
        }
        .dc-card-meta { font-size: 11px; color: #bbb; margin: 0; }
        .dc-card-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .dc-original-btn,
        .dc-view-btn {
          flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          border-radius: 12px; padding: 10px 14px; font-size: 13px; font-weight: 600;
          transition: 0.2s; font-family: inherit;
          text-decoration: none;
        }
        .dc-original-btn {
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9); color: #ff5d8f;
        }
        .dc-original-btn:hover { background: rgba(255,143,177,0.12); border-color: #ff8fb1; color: #ff5d8f; transform: translateY(-1px); }
        .dc-view-btn {
          border: none; color: white; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          cursor: pointer;
        }
        .dc-view-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .dc-delete-btn {
          width: 38px; height: 38px; flex-shrink: 0;
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 12px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; color: #ddd; transition: 0.2s;
        }
        .dc-delete-btn:hover:not(:disabled) { background: #fde8e8; border-color: #ffd0d0; color: #e05555; }
        .dc-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Empty ── */
        .dp-empty {
          text-align: center; padding: 56px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.6);
          border-radius: 28px; border: 1.5px dashed #ffd6e1;
        }
        .dp-empty-icon  { font-size: 48px; line-height: 1; margin-bottom: 4px; }
        .dp-empty-title { margin: 0; font-size: 1.3rem; color: #333; font-weight: 700; }
        .dp-empty-hint  { margin: 0; color: #aaa; font-size: 14px; max-width: 340px; line-height: 1.6; }

        /* ── Skeleton ── */
        .dp-skeleton-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
        .dp-skeleton-card {
          height: 200px; border-radius: 22px;
          background: linear-gradient(90deg,#f8f0f4 25%,#fde8ef 50%,#f8f0f4 75%);
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        /* ── Spinner ── */
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── Results count ── */
        .dp-count { font-size: 12px; color: #bbb; margin: 0; }

        /* ── Viewer ── */
        .dv-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
          z-index: 1000; display: flex; align-items: stretch; justify-content: center; padding: 0;
        }
        .dv-modal {
          background: #1a1a2e; width: 100%; max-width: 900px;
          display: flex; flex-direction: column;
          animation: slide-up 0.28s ease both;
        }
        @keyframes slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .dv-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 18px; background: rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.08); gap: 12px; flex-shrink: 0;
        }
        .dv-header-left  { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .dv-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .dv-type-badge   { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .dv-filename     { font-size: 14px; font-weight: 600; color: white; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dv-open-btn {
          background: rgba(255,255,255,0.12); color: white; border: none; border-radius: 10px;
          padding: 8px 14px; font-size: 12px; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: 0.2s; display: flex; align-items: center; gap: 4px;
        }
        .dv-open-btn:hover { background: rgba(255,255,255,0.22); }
        .dv-close-btn {
          width: 36px; height: 36px; border: none; background: rgba(255,255,255,0.1);
          border-radius: 10px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; color: white; transition: 0.2s;
        }
        .dv-close-btn:hover { background: rgba(255,255,255,0.2); }
        .dv-body { flex: 1; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .dv-iframe { width: 100%; height: 100%; border: none; transition: opacity 0.3s; }
        .dv-loading, .dv-failed {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
          color: rgba(255,255,255,0.6);
        }
        .dv-loading p { font-size: 14px; margin: 0; }
        .dv-loading .spin { color: #ff8fb1; }
        .dv-failed-title { font-size: 16px; font-weight: 700; color: white; margin: 0; }
        .dv-failed-hint  { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }
        .dv-download-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 999px;
          padding: 10px 20px; font-size: 13px; font-weight: 600;
          text-decoration: none; margin-top: 8px; transition: 0.2s;
        }
        .dv-download-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* ── Responsive ── */
        @media (max-width: 767px) {
          .dp-page          { border-radius: 22px; padding: 20px 20px 56px; }
          .dp-title         { font-size: 1.7rem; }
          .dp-grid          { grid-template-columns: 1fr; }
          .dp-skeleton-grid { grid-template-columns: 1fr; }
          .dv-modal         { border-radius: 0; }
          .dc-card-icon-wrap{ height: 70px; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .dp-page  { padding: 24px; }
          .dp-grid  { grid-template-columns: repeat(2,1fr); }
          .dv-modal { margin: 20px; border-radius: 20px; }
        }
        @media (min-width: 1024px) {
          .dp-grid  { grid-template-columns: repeat(3,1fr); }
          .dv-modal { margin: 24px auto; border-radius: 20px; }
        }
      `}</style>

      <div className="dp-page">
        {/* Header */}
        <div>
          <h1 className="dp-title">My <span className="dp-title-accent">Documents</span></h1>
        </div>

        {/* Storage usage bar — always visible */}
        <StorageBar usedBytes={usedBytes} />
          <p className="dp-preview-note">
            Note: preview rendering may differ from the uploaded PPTX. Use “Open original” to verify the exact file.
          </p>
        {/* Upload zone — locked when full */}
        <UploadZone
          onUpload={handleUpload}
          uploading={uploading}
          progress={progress}
          isFull={isFull}
          usedBytes={usedBytes}
        />

        {/* Upload error */}
        {uploadError && (
          <div className="dp-upload-error">
            <AlertCircle size={15} />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Toolbar */}
        <div className="dp-toolbar">
          <div className="dp-search-wrap">
            <Search size={14} className="dp-search-icon" />
            <input
              className="dp-search"
              placeholder="Search files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="dp-refresh-btn" onClick={fetchDocs} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="dp-filter-tabs">
          {[
            { id: 'all',  label: 'All'  },
            { id: 'pdf',  label: 'PDF'  },
            { id: 'docx', label: 'DOCX' },
            { id: 'pptx', label: 'PPTX' },
          ].map(t => (
            <button
              key={t.id}
              className={`dp-tab ${filterType === t.id ? 'active' : ''}`}
              onClick={() => setFilterType(t.id)}
            >
              {t.label}
              <span className="dp-tab-count">{counts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Results count */}
        {(search || filterType !== 'all') && !loading && (
          <p className="dp-count">
            Showing {filtered.length} of {docs.length} file{docs.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* File grid */}
        {loading ? (
          <div className="dp-skeleton-grid">
            {[1,2,3,4].map(i => <div key={i} className="dp-skeleton-card" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-icon">{docs.length === 0 ? '📂' : '🔍'}</div>
            <p className="dp-empty-title">
              {docs.length === 0 ? 'No files uploaded yet' : 'No files match your search'}
            </p>
            <p className="dp-empty-hint">
              {docs.length === 0
                ? 'Upload a PDF, DOCX, or PPTX to get started'
                : 'Try clearing your search or filter'}
            </p>
          </div>
        ) : (
          <div className="dp-grid">
            {filtered.map(doc => (
              <FileCard
                key={doc.id}
                doc={doc}
                onView={setViewingDoc}
                onDelete={handleDelete}
                deleting={deletingId === doc.id}
              />
            ))}
          </div>
        )}
      </div>

      {viewingDoc && (
        <FileViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
    </>
  );
}

