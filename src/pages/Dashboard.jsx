import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

import InternDashboard from '../components/InternDashboard';
import RotationGuide from '../components/RotationGuide';
import DailyReportTracker from '../components/QuotaTracker';
import ShiftPlanner from '../components/ShiftPlanner';
import NotesSection from '../components/NotesSection';

import {
  LayoutDashboard,
  ClipboardList,
  CalendarClock,
  NotebookPen,
  Microscope,
  FolderOpen,
} from 'lucide-react';

function Dashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'guide',
      label: 'Rotation Guide',
      icon: <Microscope size={18} />,
    },
    {
      id: 'reports',
      label: 'Daily Reports',
      icon: <ClipboardList size={18} />,
    },
    {
      id: 'shifts',
      label: 'Shifts',
      icon: <CalendarClock size={18} />,
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <NotebookPen size={18} />,
    },
  ];

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          .dashboard-page {
            width: 100%;
            min-height: 100vh;
          }

          .welcome-section {
            margin-bottom: 28px;
          }

          .welcome-title {
            font-size: 2rem;
            font-weight: 700;
            color: #ff5d8f;
            margin-bottom: 10px;
          }

          .welcome-subtitle {
            color: #777;
            font-size: 1rem;
            line-height: 1.6;
          }

          .welcome-actions {
            margin-top: 22px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .welcome-action-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 18px;
            border-radius: 999px;
            background: linear-gradient(135deg,#ff8fb1,#ff6f91);
            color: white;
            font-weight: 700;
            font-size: 0.95rem;
            border: none;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .welcome-action-link:hover {
            transform: translateY(-1px);
            box-shadow: 0 10px 24px rgba(255,111,145,0.22);
          }

          .welcome-action-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          .dashboard-container {
            display: flex;
            gap: 24px;
            width: 100%;
          }

          .dashboard-nav {
            width: 270px;
            min-width: 270px;

            background: rgba(255,255,255,0.72);
            backdrop-filter: blur(14px);

            border-radius: 28px;

            padding: 20px;

            display: flex;
            flex-direction: column;
            gap: 14px;

            box-shadow: 0 8px 24px rgba(255, 111, 145, 0.08);
            border: 1px solid rgba(255,255,255,0.4);

            height: fit-content;
          }

          .nav-button {
            width: 100%;
            border: none;
            background: transparent;

            padding: 16px 18px;

            border-radius: 18px;

            display: flex;
            align-items: center;
            gap: 12px;

            font-size: 15px;
            font-weight: 500;

            color: #666;

            cursor: pointer;

            transition: all 0.22s ease;
          }

          .nav-button:hover {
            background: rgba(255,255,255,0.9);
            color: #ff5d8f;
            transform: translateY(-1px);
          }

          .nav-button.active {
            background: linear-gradient(
              135deg,
              #ff8fb1,
              #ff6f91
            );

            color: white;

            box-shadow: 0 8px 22px rgba(255,111,145,0.24);
          }

          .dashboard-content {
            flex: 1;

            background: rgba(255,255,255,0.72);
            backdrop-filter: blur(14px);

            border-radius: 30px;

            padding: 32px;

            min-height: 720px;

            box-shadow: 0 8px 24px rgba(255, 111, 145, 0.08);
            border: 1px solid rgba(255,255,255,0.4);
          }

          .user-card {
            background: linear-gradient(
              135deg,
              #ff8fb1,
              #ff6f91
            );

            border-radius: 24px;

            padding: 24px;

            margin-bottom: 28px;

            color: white;

            box-shadow: 0 10px 30px rgba(255,111,145,0.24);
          }

          .user-card h2 {
            margin: 0;
            font-size: 1.6rem;
          }

          .user-card p {
            margin-top: 10px;
            opacity: 0.95;
            line-height: 1.6;
          }

          /* iPhone */
          @media (max-width: 768px) {
            .dashboard-container {
              flex-direction: column;
            }

            .dashboard-nav {
              width: 100%;
              min-width: 100%;

              flex-direction: row;

              overflow-x: auto;

              padding: 14px;
            }

            .nav-button {
              min-width: fit-content;
              white-space: nowrap;
            }

            .dashboard-content {
              padding: 20px;
              min-height: auto;
            }

            .welcome-title {
              font-size: 1.6rem;
            }

            .user-card {
              padding: 20px;
            }
          }

          /* iPad */
          @media (min-width: 769px) and (max-width: 1024px) {
            .dashboard-nav {
              width: 220px;
              min-width: 220px;
            }

            .dashboard-content {
              padding: 26px;
            }
          }
        `}
      </style>

      <main className="dashboard-page">
        {/* Welcome */}
        <section className="welcome-section">
          
        </section>


        {/* Main Dashboard */}
        <div className="dashboard-container">
          {/* Sidebar */}
          

          {/* Content */}
          <div className="dashboard-content">
            {activeTab === 'dashboard' && <InternDashboard />}

            {activeTab === 'guide' && <RotationGuide />}

            {activeTab === 'reports' && <DailyReportTracker />}

            {activeTab === 'shifts' && <ShiftPlanner />}

            {activeTab === 'notes' && <NotesSection />}
          </div>
        </div>
      </main>
    </>
  );
}

export default Dashboard;