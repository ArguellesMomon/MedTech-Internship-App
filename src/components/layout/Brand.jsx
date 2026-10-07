import { Link } from 'react-router-dom';
import { Microscope } from 'lucide-react';
export default function Brand() {
  return (
    <Link to="/" className="mate-brand" aria-label="MedTech Mate home">
      <span className="brand-symbol">
        <Microscope size={22} strokeWidth={1.7} />
        <span />
      </span>
      <span>
        medtech<span className="brand-mate">mate</span>
        <small>YOUR INTERNSHIP COMPANION</small>
      </span>
    </Link>
  );
}
