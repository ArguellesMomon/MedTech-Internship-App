import {
  LayoutDashboard,
  Microscope,
  ClipboardList,
  CalendarDays,
  NotebookPen,
  FolderOpen,
} from 'lucide-react';
export const navigation = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/rotations', icon: Microscope, label: 'Rotations' },
  { to: '/reports', icon: ClipboardList, label: 'Logbook & quotas' },
  { to: '/shifts', icon: CalendarDays, label: 'Shifts & exams' },
  { to: '/notes', icon: NotebookPen, label: 'Notes & little tips' },
  { to: '/documents', icon: FolderOpen, label: 'Document library' },
];
