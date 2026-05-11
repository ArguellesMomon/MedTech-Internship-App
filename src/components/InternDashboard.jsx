import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

import {
  Microscope,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react';

/* =========================================================
   CURRENT ROTATION
========================================================= */

function CurrentRotation() {
  const { user } = useAuth();

  const [rotation, setRotation] = useState(null);

  const fetchCurrentRotation = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('rotations')
      .select('*')
      .eq('user_id', user.id)
      .lte('start_date', today)
      .gte('end_date', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(error);
    }

    setRotation(data);
  };

  useEffect(() => {
    fetchCurrentRotation();
    const interval = setInterval(fetchCurrentRotation, 5000);
    return () => clearInterval(interval);
  }, [user.id]);



  return (
    <div className="dashboard-card">
      <div className="card-header">
        <div className="card-icon pink">
          <Microscope size={20} />
        </div>

        <div>
          <h3>Current Rotation</h3>
          <p>Your active internship assignment</p>
        </div>
      </div>

      {!rotation ? (
        <div className="empty-state">
          <p>No active rotation yet ✨</p>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>Manage rotations in the Rotation Guide</p>
        </div>
      ) : (
        <div className="rotation-content">
          <h4>{rotation.section_name}</h4>

          <span className="badge">
            {rotation.hospital_site}
          </span>

          <div className="info-list">
            <p>
              📅{' '}
              {new Date(
                rotation.start_date,
              ).toLocaleDateString()}
              {' - '}
              {new Date(
                rotation.end_date,
              ).toLocaleDateString()}
            </p>

            <p>
              👩‍⚕️ Supervisor:{' '}
              {rotation.supervisor_name || 'N/A'}
            </p>

            {rotation.notes && (
              <p>📝 {rotation.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   UPCOMING SHIFTS
========================================================= */

function UpcomingShifts() {
  const { user } = useAuth();

  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    const fetchUpcomingShifts = async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .gte('shift_date', today)
        .order('shift_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error(error);
      } else {
        setShifts(data);
      }
    };

    fetchUpcomingShifts();
  }, [user.id]);

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <div className="card-icon orange">
          <CalendarDays size={20} />
        </div>

        <div>
          <h3>Upcoming Shifts</h3>
          <p>Your next duties and schedules</p>
        </div>
      </div>

      {shifts.length === 0 ? (
        <div className="empty-state">
          <p>No upcoming shifts 🌸</p>
        </div>
      ) : (
        <div className="list-group">
          {shifts.map((shift) => (
            <div key={shift.id} className="list-item">
              <strong>
                {new Date(
                  shift.shift_date,
                ).toLocaleDateString()}
              </strong>

              <span>
                {shift.shift_type}
              </span>

              <small>
                {shift.start_time} - {shift.end_time}
              </small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   EXAMS
========================================================= */

function ExamDates() {
  const { user } = useAuth();

  const [exams, setExams] = useState([]);
  const [examError, setExamError] = useState(null);

  const isMissingTableError = (error) => {
    return (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table'));
  };

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('user_id', user.id)
      .order('exam_date', { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        setExamError(
          'The exams table is not present in your Supabase project. Run supabase/schema.sql or create the table in Supabase.'
        );
      } else {
        console.error(error);
      }
    } else {
      setExams(data || []);
      setExamError(null);
    }
  };

  useEffect(() => {
    fetchExams();
    const interval = setInterval(fetchExams, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const getExamStatus = (examDate) => {
    const today = new Date();
    const exam = new Date(examDate);
    const daysUntil = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return { status: 'past', label: 'Past', color: '#4abf95' };
    if (daysUntil === 0) return { status: 'today', label: 'Today', color: '#e05555' };
    if (daysUntil === 1) return { status: 'tomorrow', label: 'Tomorrow', color: '#ff8c5a' };
    if (daysUntil <= 7) return { status: 'week', label: `${daysUntil}d away`, color: '#ff8fb1' };
    return { status: 'upcoming', label: `${daysUntil}d away`, color: '#5f8dff' };
  };



  return (
    <div className="dashboard-card">
      <div className="card-header">
        <div className="card-icon blue">
          <GraduationCap size={20} />
        </div>

        <div>
          <h3>Exam Dates</h3>
          <p>Stay prepared and organized</p>
        </div>
      </div>

      {examError && (
        <div className="error-message">
          {examError}
        </div>
      )}

      {exams.length === 0 ? (
        <div className="empty-state">
          <p>No exams scheduled 💖</p>
          <p style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>Manage exams in the Exam Dates page</p>
        </div>
      ) : (
        <div className="exam-list">
          {exams.map((exam) => {
            const { status, label, color } = getExamStatus(exam.exam_date);
            return (
              <div key={exam.id} className={`exam-item exam-item-${status}`}>
                <div className="exam-item-left">
                  <div className="exam-date-badge">
                    <div className="exam-date-day">
                      {new Date(exam.exam_date).getDate()}
                    </div>
                    <div className="exam-date-month">
                      {new Date(exam.exam_date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  <div className="exam-details">
                    <strong className="exam-name">{exam.exam_name}</strong>
                    {exam.section_name && (
                      <span className="exam-section">{exam.section_name}</span>
                    )}
                  </div>
                </div>
                <div className="exam-status" style={{ color }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   PROGRESS
========================================================= */

function OverallProgress() {
  const { user } = useAuth();

  const [progress, setProgress] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('quotas')
        .select(
          'section_name, target_count, completed_count',
        )
        .eq('user_id', user.id);

      if (error) {
        console.error(error);
      } else {
        const grouped = data.reduce((acc, quota) => {
          if (!acc[quota.section_name]) {
            acc[quota.section_name] = {
              total: 0,
              completed: 0,
            };
          }

          acc[quota.section_name].total +=
            quota.target_count;

          acc[quota.section_name].completed +=
            quota.completed_count;

          return acc;
        }, {});

        setProgress(Object.entries(grouped));
      }
    };

    fetchProgress();
  }, [user.id]);

  return (
    <div className="dashboard-card">
      <div className="card-header">
        <div className="card-icon green">
          <ClipboardCheck size={20} />
        </div>

        <div>
          <h3>Overall Progress</h3>
          <p>Your internship completion status</p>
        </div>
      </div>

      {progress.length === 0 ? (
        <div className="empty-state">
          <p>No quotas set yet ✨</p>
        </div>
      ) : (
        progress.map(
          ([section, { total, completed }]) => {
            const percentage =
              total > 0
                ? Math.round(
                    (completed / total) * 100,
                  )
                : 0;

            return (
              <div
                key={section}
                className="progress-item"
              >
                <div className="progress-top">
                  <span>{section}</span>

                  <span>
                    {completed}/{total}
                  </span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
              </div>
            );
          },
        )
      )}
    </div>
  );
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

function InternDashboard() {
  return (
    <>
      <style>
        {`
          .intern-dashboard {
            width: 100%;
          }

          .dashboard-title {
            font-size: 2rem;
            font-weight: 700;
            color: #ff5d8f;
            margin-bottom: 26px;
          }

          .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }

          .dashboard-card {
            background: rgba(255,255,255,0.82);

            border-radius: 28px;

            padding: 24px;

            backdrop-filter: blur(14px);

            border: 1px solid rgba(255,255,255,0.4);

            box-shadow: 0 10px 30px rgba(255,111,145,0.08);
          }

          .card-header {
            display: flex;
            align-items: center;
            gap: 14px;

            margin-bottom: 22px;
          }

          .card-header h3 {
            margin: 0;
            font-size: 1.15rem;
            color: #444;
          }

          .card-header p {
            margin: 4px 0 0;
            color: #888;
            font-size: 0.9rem;
          }

          .card-icon {
            width: 48px;
            height: 48px;

            border-radius: 16px;

            display: flex;
            align-items: center;
            justify-content: center;

            color: white;
          }

          .pink {
            background: linear-gradient(
              135deg,
              #ff8fb1,
              #ff6f91
            );
          }

          .orange {
            background: linear-gradient(
              135deg,
              #ffb37a,
              #ff8c5a
            );
          }

          .blue {
            background: linear-gradient(
              135deg,
              #7ab6ff,
              #5f8dff
            );
          }

          .green {
            background: linear-gradient(
              135deg,
              #6dd6b1,
              #4abf95
            );
          }

          .error-message {
            margin: 18px 0;
            padding: 14px 16px;
            border-radius: 16px;
            background: #ffe4ec;
            color: #b22249;
            font-weight: 600;
          }

          .empty-state {
            padding: 24px 0;
            color: #888;
          }

          .primary-btn {
            border: none;

            background: linear-gradient(
              135deg,
              #ff8fb1,
              #ff6f91
            );

            color: white;

            border-radius: 16px;

            padding: 13px 18px;

            font-weight: 600;

            display: inline-flex;
            align-items: center;
            gap: 8px;

            cursor: pointer;

            transition: 0.2s ease;
          }

          .primary-btn:hover {
            transform: translateY(-1px);
          }

          .secondary-btn {
            border: none;

            background: #f4f4f4;

            color: #666;

            border-radius: 16px;

            padding: 13px 18px;

            font-weight: 600;

            cursor: pointer;
          }

          .cute-form {
            display: flex;
            flex-direction: column;
            gap: 14px;

            margin-top: 22px;
          }

          .cute-form input,
          .cute-form textarea {
            width: 100%;

            border: 1px solid #ffd6e1;

            background: #fff8fa;

            border-radius: 18px;

            padding: 14px 16px;

            font-size: 16px;

            outline: none;

            transition: 0.2s ease;
          }

          .cute-form input:focus,
          .cute-form textarea:focus {
            border-color: #ff8fb1;

            background: white;

            box-shadow: 0 0 0 4px rgba(255,143,177,0.18);
          }

          .cute-form textarea {
            min-height: 100px;
            resize: vertical;
          }

          .form-actions {
            display: flex;
            gap: 12px;
          }

          .badge {
            display: inline-block;

            background: #ffe4ec;

            color: #ff5d8f;

            padding: 8px 14px;

            border-radius: 999px;

            font-size: 13px;
            font-weight: 600;

            margin-top: 10px;
            margin-bottom: 18px;
          }

          .info-list {
            display: flex;
            flex-direction: column;
            gap: 10px;

            color: #666;
          }

          .list-group {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .list-item {
            background: #fff8fa;

            border-radius: 18px;

            padding: 16px;

            display: flex;
            flex-direction: column;
            gap: 6px;

            border: 1.5px solid #ffe0ea;
            transition: 0.2s ease;
          }

          .list-item:hover {
            border-color: #ffb8ce;
            box-shadow: 0 4px 12px rgba(255,111,145,0.08);
          }

          .list-item strong {
            color: #444;
          }

          .list-item span {
            color: #ff5d8f;
            font-weight: 500;
          }

          .list-item small {
            color: #888;
          }

          .progress-item {
            margin-bottom: 18px;
          }

          .progress-top {
            display: flex;
            justify-content: space-between;

            margin-bottom: 10px;

            color: #555;
            font-size: 14px;
          }

          .progress-bar {
            width: 100%;
            height: 12px;

            background: #f3dbe3;

            border-radius: 999px;

            overflow: hidden;
          }

          .progress-fill {
            height: 100%;

            background: linear-gradient(
              135deg,
              #ff8fb1,
              #ff6f91
            );

            border-radius: 999px;
          }

          .exam-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .exam-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fff8fa;
            border-radius: 18px;
            padding: 16px;
            border: 1.5px solid #ffe0ea;
            transition: 0.2s ease;
          }

          .exam-item:hover {
            border-color: #ffb8ce;
            box-shadow: 0 4px 12px rgba(255,111,145,0.1);
          }

          .exam-item-past {
            opacity: 0.6;
          }

          .exam-item-today {
            border-color: #e05555;
            background: linear-gradient(135deg, #fff0f0, #fff8fa);
            box-shadow: 0 0 0 2px rgba(224,85,85,0.2);
          }

          .exam-item-left {
            display: flex;
            align-items: center;
            gap: 14px;
            flex: 1;
          }

          .exam-date-badge {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #ff8fb1, #ff6f91);
            border-radius: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(255,111,145,0.2);
          }

          .exam-date-day {
            font-weight: 700;
            font-size: 18px;
            line-height: 1;
          }

          .exam-date-month {
            font-size: 10px;
            font-weight: 600;
            opacity: 0.9;
            margin-top: 2px;
          }

          .exam-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .exam-name {
            color: #333;
            font-size: 14px;
            margin: 0;
          }

          .exam-section {
            color: #999;
            font-size: 12px;
          }

          .exam-status {
            font-weight: 600;
            font-size: 13px;
            white-space: nowrap;
            padding: 6px 12px;
            background: rgba(255,143,177,0.1);
            border-radius: 999px;
          }

          /* iPhone */
          @media (max-width: 768px) {
            .dashboard-grid {
              grid-template-columns: 1fr;
            }

            .dashboard-card {
              padding: 20px;
            }

            .dashboard-title {
              font-size: 1.7rem;
            }

            .exam-item {
              padding: 14px;
            }

            .exam-date-badge {
              width: 50px;
              height: 50px;
              font-size: 16px;
            }
          }

          /* iPad */
          @media (min-width: 769px) and (max-width: 1024px) {
            .dashboard-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div className="intern-dashboard">
        <h2 className="dashboard-title">
          Internship Overview ✨
        </h2>

        <div className="dashboard-grid">
          <CurrentRotation />

          <UpcomingShifts />

          <ExamDates />

          <OverallProgress />
        </div>
      </div>
    </>
  );
}

export default InternDashboard; 