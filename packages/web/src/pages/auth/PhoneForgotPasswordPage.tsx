import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '../../components/ui';
import { api } from '../../lib/api';

export default function PhoneForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const validatePhone = (p: string): boolean => {
    const digits = p.replace(/\D/g, '');
    return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
  };

  const handleSendOtp = async () => {
    setError('');
    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ data: { message: string; code?: string } }>('/auth/forgot-password-phone', {
        method: 'POST',
        body: { phone: phone.replace(/\D/g, '') },
      });
      setStep('reset');
      setResendTimer(30);
      if (res.data.code) setOtpCode(res.data.code);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError('');
    if (!code.trim()) { setError('OTP code is required.'); return; }
    if (!password.trim()) { setError('New password is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api('/auth/reset-password-phone', { method: 'POST', body: { phone: phone.replace(/\D/g, ''), code: code.trim(), password } });
      setSuccess('Password reset successfully! Redirecting to sign in...');
      setTimeout(() => navigate('/phone-signin'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ICP</span>
            </div>
          </Link>
          <h1 className="mt-4 text-center text-2xl font-bold text-gray-900">Reset Password</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone' ? 'Enter your phone number to receive a reset OTP' : 'Enter the OTP and set your new password'}
          </p>
        </div>

        <form className="mt-8 space-y-4 bg-white p-8 rounded-xl shadow-sm border border-gray-100" onSubmit={(e) => { e.preventDefault(); if (step === 'phone') handleSendOtp(); else handleReset(); }}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="h-5 w-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          {step === 'phone' ? (
            <Input
              label="Phone Number"
              type="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s\-+]/g, '').slice(0, 13)); setError(''); }}
              autoFocus
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  OTP sent to <span className="font-medium text-gray-900">+91 {phone}</span>
                </span>
                <button type="button" onClick={() => { setStep('phone'); setCode(''); setOtpCode(''); setError(''); }} className="text-primary-600 hover:text-primary-500 font-medium">Change</button>
              </div>
              <Input
                label="OTP Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                autoFocus
              />
              {otpCode && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-700 uppercase tracking-wide">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    Development Mode
                  </div>
                  <p className="text-2xl font-bold text-blue-900 font-mono tracking-[0.3em]">{otpCode}</p>
                  <p className="text-xs text-blue-600">Use this code to reset your password. This is only shown in development.</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={resendTimer > 0 || loading}
                className="text-sm text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
              </button>
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  hint="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              />
            </>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {step === 'phone' ? 'Send OTP' : 'Reset Password'}
          </Button>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <Link to="/phone-signin" className="font-medium text-primary-600 hover:text-primary-500">Back to Sign In</Link>
            <span className="text-gray-300">|</span>
            <Link to="/signin" className="font-medium text-primary-600 hover:text-primary-500">Email login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
