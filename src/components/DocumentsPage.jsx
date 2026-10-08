import ThemedIcon from './ui/ThemedIcon';
import Dialog from './ui/Dialog';
import '../styles/features/DocumentsPage.css';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  Upload,
  FileText,
  Presentation,
  Trash2,
  Eye,
  X,
  AlertCircle,
  Search,
  Loader2,
  File,
  RefreshCw,
  HardDrive,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const MAX_FILE_MB = 10;
const CAP_MB = 10;
const CAP_BYTES = CAP_MB * 1024 * 1024;
const MAX_BYTES = MAX_FILE_MB * 1024 * 1024;
const ACCEPT = '.pdf,.doc,.docx,.ppt,.pptx';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['docx', 'doc'].includes(ext)) return 'docx';
  if (['pptx', 'ppt'].includes(ext)) return 'pptx';
  return 'other';
}

function getFileMeta(type) {
  return (
    {
      pdf: { label: 'PDF', color: '#e05555', bg: 'var(--rose-soft)', Icon: FileText },
      docx: { label: 'DOCX', color: '#5f8dff', bg: 'var(--lavender-soft)', Icon: FileText },
      pptx: { label: 'PPTX', color: '#ff8c5a', bg: 'var(--peach-soft)', Icon: Presentation },
      other: { label: 'File', color: 'var(--muted)', bg: 'var(--surface-subtle)', Icon: File },
    }[type] ?? { label: 'File', color: 'var(--muted)', bg: 'var(--surface-subtle)', Icon: File }
  );
}

function fmtSize(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(str) {
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getViewerUrl(url, type) {
  if (type === 'pdf') return url;
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
}

/* Usage level: 'ok' | 'warn' | 'critical' | 'full' */
function getUsageLevel(pct) {
  if (pct >= 100) return 'full';
  if (pct >= 90) return 'critical';
  if (pct >= 75) return 'warn';
  return 'ok';
}

const USAGE_COLORS = {
  ok: { bar: 'linear-gradient(90deg,#ff8fb1,#ff6f91)', text: '#ff6f91', icon: '#ff6f91' },
  warn: { bar: 'linear-gradient(90deg,#ffb37a,#ff8c5a)', text: '#ff8c5a', icon: '#ff8c5a' },
  critical: { bar: 'linear-gradient(90deg,#ff8f8f,#e05555)', text: '#e05555', icon: '#e05555' },
  full: { bar: 'linear-gradient(90deg,#ff8f8f,#e05555)', text: '#e05555', icon: '#e05555' },
};

/* ─────────────────────────────────────────────
   STORAGE USAGE BAR
───────────────────────────────────────────── */
function StorageBar({ usedBytes }) {
  const pct = Math.min(100, Math.round((usedBytes / CAP_BYTES) * 100));
  const level = getUsageLevel(pct);
  const colors = USAGE_COLORS[level];
  const freeBytes = Math.max(0, CAP_BYTES - usedBytes);

  return (
    <div className="sb-card">
      <div className="sb-top">
        <div className="sb-left">
          <HardDrive size={16} style={{ color: 'var(--ink)', flexShrink: 0 }} />
          <span className="sb-label">Storage</span>
        </div>
        <span className="sb-numbers">
          {fmtSize(usedBytes)}
          <span className="sb-cap"> of {CAP_MB} MB</span>
        </span>
      </div>

      <div className="sb-track">
        <div className="sb-fill" style={{ width: `${pct}%`, background: colors.bar }} />
      </div>

      <div className="sb-bottom">
        <span
          className="sb-pct"
          style={{
            color: 'var(--ink)',
            fontWeight: level !== 'ok' ? 600 : 400,
          }}
        >
          {level === 'full' ? (
            <>
              <ThemedIcon name="Ban" /> Storage full — delete files to upload more
            </>
          ) : level === 'critical' ? (
            <>
              <ThemedIcon name="TriangleAlert" /> {pct}% used — almost full!
            </>
          ) : level === 'warn' ? (
            `${pct}% used`
          ) : (
            `${pct}% used`
          )}
        </span>
        {level !== 'full' && <span className="sb-free">{fmtSize(freeBytes)} free</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FILE VIEWER MODAL
───────────────────────────────────────────── */
function FileViewer({ doc, onClose }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const meta = getFileMeta(doc.file_type);
  const src = getViewerUrl(doc.file_url, doc.file_type);

  return (
    <Dialog className="dv-overlay" onClose={onClose}>
      <div className="dv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dv-header">
          <div className="dv-header-left">
            <span className="dv-type-badge">{meta.label}</span>
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
              <ThemedIcon name="ArrowUpRight" /> Open original
            </a>
            <button aria-label="Close" className="dv-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
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
              <AlertCircle size={32} style={{ color: 'var(--peach)', marginBottom: 12 }} />
              <p className="dv-failed-title">Preview unavailable</p>
              <p className="dv-failed-hint">This file can't be previewed here.</p>
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="dv-download-btn"
              >
                <ThemedIcon name="ArrowUpRight" /> Open file in new tab
              </a>
            </div>
          ) : (
            <iframe
              src={src}
              className="dv-iframe"
              title={doc.file_name}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setFailed(true);
              }}
              style={{ opacity: loading ? 0 : 1 }}
            />
          )}
        </div>
      </div>
    </Dialog>
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
      <div className="dc-card-icon-wrap">
        <Icon size={28} style={{ color: 'var(--ink)' }} />
        <span className="dc-type-chip">{meta.label}</span>
      </div>
      <div className="dc-card-info">
        <p className="dc-card-name" title={doc.file_name}>
          {doc.file_name}
        </p>
        <p className="dc-card-meta">
          {fmtSize(doc.file_size)} · {fmtDate(doc.created_at)}
        </p>
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
      alert(
        `Not enough space. This file (${fmtSize(file.size)}) would exceed your ${CAP_MB} MB limit. Free up space by deleting files first.`,
      );
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
          <HardDrive size={24} style={{ color: 'var(--danger)' }} />
        </div>
        <p className="uz-full-title">Storage full</p>
        <p className="uz-full-hint">
          You've used all {CAP_MB} MB of your storage.
          <br />
          Delete existing files to upload new ones.
        </p>
      </div>
    );
  }

  /* ── UPLOADING state ── */
  if (uploading) {
    return (
      <div className="uz-zone uz-uploading-state">
        <Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} />
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
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="uz-icon-wrap">
        <Upload size={22} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="uz-title">{dragging ? 'Drop file here' : 'Upload a document'}</p>
      <p className="uz-hint">PDF, DOCX, or PPTX · Max {MAX_FILE_MB} MB per file</p>
      <button className="uz-browse-btn" type="button">
        Browse files
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function DocumentsPage() {
  const { user } = useAuth();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  /* ── Derived: total used bytes ── */
  const usedBytes = useMemo(() => docs.reduce((sum, d) => sum + (d.file_size ?? 0), 0), [docs]);
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
    else setUploadError('Your library couldn’t load. Check your connection and try refreshing.');
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) fetchDocs();
  }, [fetchDocs, user?.id]);

  /* ── Upload ── */
  const handleUpload = async (file) => {
    setUploading(true);
    setProgress(0);
    setUploadError('');

    let interval;
    try {
      const type = getFileType(file.name);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${user.id}/${crypto.randomUUID()}_${safeName}`;

      interval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85));
      }, 300);

      const { error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { contentType: file.type, upsert: false });

      clearInterval(interval);
      if (uploadErr) throw uploadErr;

      setProgress(95);

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

      const { error: dbErr } = await supabase.from('documents').insert([
        {
          user_id: user.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
          storage_path: path,
          file_type: type,
          file_size: file.size,
        },
      ]);

      if (dbErr) {
        await supabase.storage.from('documents').remove([path]);
        throw dbErr;
      }
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
      await fetchDocs();
    } catch (err) {
      setUploadError(err.message ?? 'Upload failed. Please try again.');
    } finally {
      clearInterval(interval);
      setUploading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    const doc = deleteTarget;
    if (!doc) return;
    setDeletingId(doc.id);
    setUploadError('');
    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path]);
      if (storageError) throw storageError;
      const { error: recordError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)
        .eq('user_id', user.id);
      if (recordError) throw recordError;
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      if (viewingDoc?.id === doc.id) setViewingDoc(null);
      setDeleteTarget(null);
    } catch (error) {
      setUploadError('The file couldn’t be deleted. Please try again.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Filter ── */
  const filtered = docs
    .filter((d) => filterType === 'all' || d.file_type === filterType)
    .filter((d) => !search || d.file_name.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: docs.length,
    pdf: docs.filter((d) => d.file_type === 'pdf').length,
    docx: docs.filter((d) => d.file_type === 'docx').length,
    pptx: docs.filter((d) => d.file_type === 'pptx').length,
  };

  return (
    <>
      <div className="dp-page">
        {/* Header */}
        <div>
          <h1 className="dp-title">
            My <span className="dp-title-accent">Documents</span>
          </h1>
        </div>

        {/* Storage usage bar — always visible */}
        <StorageBar usedBytes={usedBytes} />
        <p className="dp-preview-note">
          Note: preview rendering may differ from the uploaded PPTX. Use “Open original” to verify
          the exact file.
          <br />
          <strong>
            <ThemedIcon name="Package" /> Storage limit:
          </strong>{' '}
          Each user has a total of 10 MB for all uploaded documents. Please delete old files if you
          need more space.
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="dp-refresh-btn" onClick={fetchDocs} title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="dp-filter-tabs">
          {[
            { id: 'all', label: 'All' },
            { id: 'pdf', label: 'PDF' },
            { id: 'docx', label: 'DOCX' },
            { id: 'pptx', label: 'PPTX' },
          ].map((t) => (
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="dp-skeleton-card" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="dp-empty">
            <div className="dp-empty-icon">
              {docs.length === 0 ? <ThemedIcon name="FolderOpen" /> : <ThemedIcon name="Search" />}
            </div>
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
            {filtered.map((doc) => (
              <FileCard
                key={doc.id}
                doc={doc}
                onView={setViewingDoc}
                onDelete={setDeleteTarget}
                deleting={deletingId === doc.id}
              />
            ))}
          </div>
        )}
      </div>

      {deleteTarget && (
        <Dialog
          onClose={() => {
            if (!deletingId) setDeleteTarget(null);
          }}
          label="Delete document"
        >
          <div className="quick-add-sheet">
            <div className="sheet-heading">
              <h2>Remove this document?</h2>
              <button
                className="icon-button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                aria-label="Close delete confirmation"
              >
                <X size={18} />
              </button>
            </div>
            <p>
              <strong>{deleteTarget.file_name}</strong> will be removed from your library and
              storage. This action cannot be undone.
            </p>
            {uploadError && (
              <p className="inline-error" role="alert">
                {uploadError}
              </p>
            )}
            <div className="reset-actions">
              <button
                className="button secondary"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
              >
                Keep file
              </button>
              <button
                className="button primary"
                disabled={Boolean(deletingId)}
                onClick={handleDelete}
              >
                {deletingId ? 'Removing…' : 'Remove document'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {viewingDoc && <FileViewer doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </>
  );
}
