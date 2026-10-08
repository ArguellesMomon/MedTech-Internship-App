import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { displayDate } from '../../lib/dates';
import { uniqueDates } from '../../lib/calendar';
export default function BatchDates({ date, onChange, extras, onExtrasChange, editing }) {
  const id = useId();
  const [candidate, setCandidate] = useState('');
  const dates = uniqueDates([date, ...extras]);
  return (
    <div className="batch-dates">
      <label className="m-label" htmlFor={id}>
        Date *
        <input
          id={id}
          type="date"
          className="m-input"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          required
        />
      </label>
      {!editing && (
        <>
          <div className="batch-date-list" aria-label="Additional dates">
            {extras
              .filter((d) => d !== date)
              .map((d) => (
                <span key={d}>
                  {displayDate(d)}
                  <button
                    type="button"
                    aria-label={'Remove date ' + d}
                    onClick={() => onExtrasChange(extras.filter((v) => v !== d))}
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
          </div>
          <div className="batch-add-row">
            <label className="m-label" htmlFor={id + '-extra'}>
              Add another day
              <input
                id={id + '-extra'}
                type="date"
                className="m-input"
                value={candidate}
                onChange={(e) => setCandidate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="button secondary small"
              disabled={!candidate || dates.includes(candidate) || dates.length >= 31}
              onClick={() => {
                onExtrasChange(uniqueDates([...extras, candidate]));
                setCandidate('');
              }}
            >
              <Plus size={16} />
              Add day
            </button>
          </div>
          <p className="batch-date-help">
            {dates.length > 1
              ? 'The same details will be saved to all ' + dates.length + ' dates.'
              : 'Choose more days to repeat these details.'}
          </p>
        </>
      )}
    </div>
  );
}
