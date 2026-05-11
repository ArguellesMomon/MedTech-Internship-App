import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

import {
  Microscope,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  Plus,
} from 'lucide-react';

/* =========================================================
   CURRENT ROTATION
========================================================= */

function CurrentRotation() {
  const { user } = useAuth();

  const [rotation, setRotation] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    section_name: '',
    hospital_site: '',
    start_date: '',
    end_date: '',
    supervisor_name: '',
    notes: '',
  });

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
  }, [user.id]);

  const openEditForm = () => {
    if (rotation) {
      setForm({
        section_name: rotation.section_name || '',
        hospital_site: rotation.hospital_site || '',
        start_date: rotation.start_date || '',
        end_date: rotation.end_date || '',
        supervisor_name: rotation.supervisor_name || '',
        notes: rotation.notes || '',
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    if (rotation?.id) {
      const { error } = await supabase
        .from('rotations')
        .update({ ...form })
        .eq('id', rotation.id);

      if (error) {
        console.error(error);
      } else {
        setShowForm(false);
        fetchCurrentRotation();
      }
    } else {
      const { error } = await supabase
        .from('rotations')
        .insert([{ ...form, user_id: user.id }]);

      if (error) {
        console.error(error);
      } else {
        setShowForm(false);
        fetchCurrentRotation();
      }
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!rotation?.id) return;
    const { error } = await supabase
      .from('rotations')
      .delete()
      .eq('id', rotation.id);

    if (error) {
      console.error(error);
    } else {
      setRotation(null);
      setShowForm(false);
      setForm({
        section_name: '',
        hospital_site: '',
        start_date: '',
        end_date: '',
        supervisor_name: '',
        notes: '',
      });
    }
  };

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
        <>
          <div className="empty-state">
            <p>No active rotation yet ✨</p>
          </div>

          <button
            className="primary-btn"
            onClick={() => setShowForm(true)}
          >
            <Plus size={16} />
            Add Rotation
          </button>
        </>
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

      {showForm && (
        <form onSubmit={handleSubmit} className="cute-form">
          <input
            type="text"
            placeholder="Section Name"
            value={form.section_name}
            onChange={(e) =>
              setForm({
                ...form,
                section_name: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Hospital Site"
            value={form.hospital_site}
            onChange={(e) =>
              setForm({
                ...form,
                hospital_site: e.target.value,
              })
            }
          />

          <input
            type="date"
            value={form.start_date}
            onChange={(e) =>
              setForm({
                ...form,
                start_date: e.target.value,
              })
            }
            required
          />

          <input
            type="date"
            value={form.end_date}
            onChange={(e) =>
              setForm({
                ...form,
                end_date: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Supervisor"
            value={form.supervisor_name}
            onChange={(e) =>
              setForm({
                ...form,
                supervisor_name: e.target.value,
              })
            }
          />

          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
          />

          <div className="form-actions">
            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
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
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [examError, setExamError] = useState(null);

  const [form, setForm] = useState({
    exam_name: '',
    exam_date: '',
    section_name: '',
    notes: '',
  });

  const isMissingTableError = (error) => {
    return error?.code === 'PGRST205' || error?.message?.includes('Could not find the table');
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
  }, [user.id]);

  const resetForm = () => {
    setForm({
      exam_name: '',
      exam_date: '',
      section_name: '',
      notes: '',
    });
    setEditingExam(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (editingExam) {
      const { error } = await supabase
        .from('exams')
        .update({ ...form })
        .eq('id', editingExam.id);

      if (error) {
        if (isMissingTableError(error)) {
          setExamError(
            'The exams table is not present in your Supabase project. Run supabase/schema.sql or create the table in Supabase.'
          );
        } else {
          console.error(error);
        }
      } else {
        setExamError(null);
        setShowForm(false);
        resetForm();
        fetchExams();
      }
      return;
    }

    const { error } = await supabase
      .from('exams')
      .insert([{ ...form, user_id: user.id }]);

    if (error) {
      if (isMissingTableError(error)) {
        setExamError(
          'The exams table is not present in your Supabase project. Run supabase/schema.sql or create the table in Supabase.'
        );
      } else {
        console.error(error);
      }
    } else {
      setExamError(null);
      setShowForm(false);
      resetForm();
      fetchExams();
    }
  };

  const handleEdit = (exam) => {
    setEditingExam(exam);
    setForm({
      exam_name: exam.exam_name || '',
      exam_date: exam.exam_date || '',
      section_name: exam.section_name || '',
      notes: exam.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (examId) => {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (error) {
      console.error(error);
    } else {
      fetchExams();
    }
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

      <button
        className="primary-btn"
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        disabled={Boolean(examError)}
      >
        <Plus size={16} />
        Add Exam
      </button>

      {examError && (
        <div className="error-message">
          {examError}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="cute-form">
          <input
            type="text"
            placeholder="Exam Name"
            value={form.exam_name}
            onChange={(e) =>
              setForm({
                ...form,
                exam_name: e.target.value,
              })
            }
            required
          />

          <input
            type="date"
            value={form.exam_date}
            onChange={(e) =>
              setForm({
                ...form,
                exam_date: e.target.value,
              })
            }
            required
          />

          <input
            type="text"
            placeholder="Section"
            value={form.section_name}
            onChange={(e) =>
              setForm({
                ...form,
                section_name: e.target.value,
              })
            }
          />

          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) =>
              setForm({
                ...form,
                notes: e.target.value,
              })
            }
          />

          <div className="form-actions">
            <button type="submit" className="primary-btn">
              {editingExam ? 'Update Exam' : 'Save Exam'}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {exams.length === 0 ? (
        <div className="empty-state">
          <p>No exams scheduled 💖</p>
        </div>
      ) : (
        <div className="list-group">
          {exams.map((exam) => (
            <div key={exam.id} className="list-item">
              <strong>{exam.exam_name}</strong>

              <span>
                {new Date(
                  exam.exam_date,
                ).toLocaleDateString()}
              </span>

              {exam.section_name && (
                <small>{exam.section_name}</small>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => handleEdit(exam)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => handleDelete(exam.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
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

            font-size: 14px;

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

            border: 1px solid #ffe0ea;
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