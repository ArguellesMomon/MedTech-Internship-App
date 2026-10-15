import { useId, useState } from 'react';
import { Plus, Settings2, Trash2, X } from 'lucide-react';
import Dialog from './Dialog';
import '../../styles/section-manager.css';

export default function SectionManager({
  sections,
  onAdd,
  onRemove,
  onColorChange,
  onClose,
  getSectionMeta,
}) {
  const id = useId();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);
  function add(event) {
    event.preventDefault();
    const label = name.trim();
    if (!label) return setError('Enter a section name.');
    if (sections.some((section) => section.id.toLowerCase() === label.toLowerCase())) {
      return setError('This section already exists.');
    }
    onAdd(label);
    setName('');
    setError('');
  }

  return (
    <Dialog onClose={onClose} label="Manage sections">
      <div className="section-manager">
        <header className="section-manager-header">
          <span className="section-manager-icon">
            <Settings2 size={20} />
          </span>
          <h3>
            Manage sections <span>{sections.length}</span>
          </h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Close sections"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="section-manager-body">
          <form onSubmit={add} className="section-manager-add" noValidate>
            <label htmlFor={`${id}-name`}>New section</label>
            <div className="section-manager-add-row">
              <input
                id={`${id}-name`}
                value={name}
                maxLength={40}
                placeholder="e.g. Immunology"
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
              />
              <button type="submit" className="button primary small">
                <Plus size={16} />
                Add
              </button>
            </div>
            {error && (
              <p id={`${id}-error`} role="alert" className="section-manager-error">
                {error}
              </p>
            )}
          </form>
          <div className="section-manager-list" role="list" aria-label="Sections">
            {sections.map((section, index) => {
              const color = section.color || getSectionMeta?.(section.id)?.color || '#a24869';
              return (
                <div className="section-manager-row" key={section.id} role="listitem">
                  <span className="section-manager-name">
                    <i style={{ background: color }} />
                    {section.id}
                  </span>
                  <label
                    className="section-manager-color"
                    htmlFor={`${id}-color-${index}`}
                    title={`Color for ${section.id}`}
                  >
                    <span style={{ background: color }} />
                    <input
                      id={`${id}-color-${index}`}
                      type="color"
                      aria-label={`Color for ${section.id}`}
                      value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#a24869'}
                      onChange={(event) => onColorChange(section.id, event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="button secondary small section-manager-remove"
                    aria-label={`Remove ${section.id}`}
                    aria-expanded={removing === section.id}
                    onClick={() => setRemoving(removing === section.id ? null : section.id)}
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                  {removing === section.id && (
                    <div className="section-manager-confirm">
                      <p>Existing records are kept.</p>
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => setRemoving(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="button primary small"
                        onClick={() => {
                          onRemove(section.id);
                          setRemoving(null);
                        }}
                      >
                        Remove section
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {!sections.length && <p className="section-manager-empty">No sections yet.</p>}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
