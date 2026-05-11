import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Heart, Sparkles } from 'lucide-react';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError('');

    try {
      await signIn(form);
      navigate('/');
    } catch (authError) {
      setError(authError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html,
          body,
          #root {
            width: 100%;
            min-height: 100vh;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
          }

          body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(
              135deg,
              #fff5f7 0%,
              #ffe4ec 50%,
              #fff0e5 100%
            );
          }

          .login-page {
            width: 100%;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 24px;
          }

          .login-card {
            width: 100%;
            max-width: 480px;
            min-width: 320px;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(14px);
            border-radius: 32px;
            padding: 42px 30px;
            box-shadow: 0 12px 40px rgba(255, 111, 145, 0.18);
            border: 1px solid rgba(255,255,255,0.6);
          }

          .logo-wrapper {
            width: 76px;
            height: 76px;
            border-radius: 999px;
            background: linear-gradient(135deg, #ff8fb1, #ff6f91);
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 18px;
            box-shadow: 0 8px 24px rgba(255, 111, 145, 0.3);
          }

          .title {
            text-align: center;
            font-size: 2.1rem;
            font-weight: 700;
            color: #ff5d8f;
            margin: 0;
          }

          .subtitle {
            text-align: center;
            color: #777;
            margin-top: 10px;
            margin-bottom: 34px;
            font-size: 0.95rem;
            line-height: 1.5;
          }

          .form-group {
            margin-bottom: 18px;
          }

          .label {
            display: block;
            margin-bottom: 8px;
            font-size: 0.92rem;
            font-weight: 500;
            color: #5f5f5f;
          }

          .input {
            width: 100%;
            border: 1px solid #ffd3df;
            background: #fff8fa;
            border-radius: 18px;
            padding: 15px 16px;
            font-size: 15px;
            outline: none;
            transition: all 0.25s ease;
            color: #444;
          }

          .input:focus {
            border-color: #ff8fb1;
            background: #fff;
            box-shadow: 0 0 0 4px rgba(255, 143, 177, 0.18);
          }

          .submit-btn {
            width: 100%;
            border: none;
            border-radius: 20px;
            padding: 16px;
            margin-top: 10px;
            background: linear-gradient(135deg, #ff8fb1, #ff6f91);
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 8px 20px rgba(255, 111, 145, 0.25);
          }

          .submit-btn:hover {
            transform: translateY(-1px);
          }

          .submit-btn:active {
            transform: scale(0.98);
          }

          .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .error-box {
            background: #fff1f1;
            color: #d12f2f;
            border: 1px solid #ffcfcf;
            padding: 12px 14px;
            border-radius: 14px;
            font-size: 14px;
            margin-bottom: 14px;
          }

          .bottom-text {
            text-align: center;
            margin-top: 24px;
            font-size: 14px;
            color: #777;
          }

          .bottom-link {
            color: #ff5d8f;
            font-weight: 600;
            text-decoration: none;
          }

          .bottom-link:hover {
            text-decoration: underline;
          }

          .footer-note {
            text-align: center;
            margin-top: 18px;
            color: #999;
            font-size: 12px;
          }

          /* iPhone */
          @media (max-width: 480px) {
            .login-page {
              padding: 18px;
              align-items: flex-start;
            }

            .login-card {
              margin-top: 24px;
              border-radius: 28px;
              padding: 30px 22px;
            }

            .title {
              font-size: 1.8rem;
            }

            .input {
              font-size: 16px;
              padding: 14px;
            }
          }

          /* iPad */
          @media (min-width: 768px) and (max-width: 1024px) {
            .login-card {
              max-width: 580px;
              padding: 50px;
            }

            .title {
              font-size: 2.4rem;
            }

            .input {
              font-size: 16px;
              padding: 16px;
            }

            .submit-btn {
              padding: 18px;
              font-size: 16px;
            }
          }
        `}
      </style>

      <div className="login-page">
        <div className="login-card">
          {/* Logo */}
          <div className="logo-wrapper">
            <Heart size={34} color="white" fill="white" />
          </div>

          {/* Header */}
          <h1 className="title">Welcome Back</h1>

          <p className="subtitle">
            Login to continue your medtech internship journey ✨
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email Address</label>

              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                placeholder="example@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>

              <input
                className="input"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="submit-btn"
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={16} />
                {submitting ? 'Logging in...' : 'Log in'}
              </span>
            </button>
          </form>

          <p className="bottom-text">
            New here?{' '}
            <Link to="/signup" className="bottom-link">
              Create an account
            </Link>
          </p>

          <p className="footer-note">
            Designed with care for future healthcare heroes 💖
          </p>
        </div>
      </div>
    </>
  );
}