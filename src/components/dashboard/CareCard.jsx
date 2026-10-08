import ThemedIcon from '../ui/ThemedIcon';
import { useState } from 'react';
import { Heart, ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import Hamster from '../../assets/Hamster.webp';
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
    <section className="care-card">
      <div className="care-message">
        <p className="eyebrow">
          <Heart size={13} />A LITTLE NOTE FOR YOU
        </p>
        <h2>{words[index]}</h2>
        <button
          className="care-refresh"
          onClick={() => setIndex((value) => (value + 1) % words.length)}
        >
          <RefreshCw size={13} />
          Another little reminder
        </button>
        <div className="care-mood">
          <span>How’s your heart today?</span>
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
                <ThemedIcon name={symbol} size={20} />
                <small>{label}</small>
              </button>
            ))}
          </div>
          <p role="status">{message}</p>
        </div>
      </div>
      <div className="care-pip">
        <img src={Hamster} alt="Pip, your hamster study companion" />
        <span>In your corner. Always.</span>
        <Link to="/ai-chat">
          Say hello to Pip
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
