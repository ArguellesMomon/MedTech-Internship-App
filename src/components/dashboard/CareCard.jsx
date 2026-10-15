import ThemedIcon from '../ui/ThemedIcon';
import { useId, useState } from 'react';
import '../../styles/care-card.css';
import { Heart, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import ChamiAvatar from '../ui/ChamiAvatar';
const words = [
  'You don’t have to have it all figured out. Just take the next little step.',
  'You are learning, even on the days that feel slow. I’m proud of you.',
  'A hard shift doesn’t define you. Rest, reset, and start again.',
  'Someone out there is cheering for you. Always.',
];
const moods = [
  ['great', 'Smile', 'Feeling good'],
  ['okay', 'Meh', 'Doing okay'],
  ['tired', 'Moon', 'A little tired'],
  ['overwhelmed', 'Heart', 'Need a hug'],
];
export default function CareCard() {
  const { user } = useAuth();
  const headingId = useId();
  const moodLabelId = useId();
  const [index, setIndex] = useState(0);
  const [mood, setMood] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function checkIn(value) {
    setSaving(true);
    setMessage('');
    try {
      const { error } = await supabase
        .from('mood_logs')
        .insert({ user_id: user.id, mood_tag: value });
      if (error) throw error;
      setMood(value);
      setMessage(
        value === 'tired' || value === 'overwhelmed'
          ? 'Sending you a little hug. Make room for rest today.'
          : 'A little moment for you, saved.',
      );
    } catch {
      setMessage('Your check-in couldn’t save. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="overview-card care-card" aria-labelledby={headingId}>
      <div className="care-intro">
        <div className="care-header">
          <ChamiAvatar animate size={52} label="" />
          <div className="care-heading">
            <h2 id={headingId}>A moment for you</h2>
            <Link to="/ai-chat">
              Chat with Chami <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="care-reminder">
          <Heart size={16} aria-hidden="true" />
          <p>{words[index]}</p>
          <button
            className="care-refresh"
            aria-label="Another little reminder"
            title="Another little reminder"
            onClick={() => setIndex((value) => (value + 1) % words.length)}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="care-mood" role="group" aria-labelledby={moodLabelId}>
        <span id={moodLabelId}>How are you feeling today?</span>
        <div>
          {moods.map(([value, symbol, label]) => (
            <button
              key={value}
              disabled={saving}
              aria-pressed={mood === value}
              onClick={() => checkIn(value)}
              title={label}
              aria-label={label}
            >
              <ThemedIcon name={symbol} size={18} />
              <small>{label}</small>
            </button>
          ))}
        </div>
        {(saving || message) && <p role="status">{saving ? 'Saving your check-in…' : message}</p>}
      </div>
    </section>
  );
}
