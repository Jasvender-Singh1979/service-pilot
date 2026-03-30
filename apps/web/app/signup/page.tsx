'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '@/hooks/useAuth';

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, password, name);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col relative overflow-hidden pb-32">
      {/* Gradient accent - brand color */}
      <div className="fixed top-0 right-0 -translate-y-1/3 translate-x-1/3 w-96 h-96 bg-[#c5724a]/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 relative z-10">
        {/* Logo/Branding */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 mb-8">
            <div className="w-12 h-12 bg-[#c5724a] rounded-[14px] flex items-center justify-center shadow-lg shadow-[#c5724a]/20">
              <i className="ph-fill ph-wrench text-white text-[24px]"></i>
            </div>
            <span className="text-2xl font-black text-slate-900">Service Pilot</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Create Account</h1>
          <p className="text-sm font-medium text-slate-600">Set up your Service Pilot account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[16px] p-4 mb-6 flex items-start gap-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="ph-fill ph-warning-circle text-red-600 text-sm"></i>
            </div>
            <p className="text-sm font-medium text-red-900 flex-1">{error}</p>
          </div>
        )}

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Full Name
            </label>
            <div className="relative flex items-center">
              <i className="ph ph-user text-slate-400 text-lg absolute left-4"></i>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Smith"
                className="w-full h-12 bg-white rounded-[12px] border border-slate-200 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#c5724a] focus:ring-2 focus:ring-[#c5724a]/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Email Address
            </label>
            <div className="relative flex items-center">
              <i className="ph ph-envelope text-slate-400 text-lg absolute left-4"></i>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full h-12 bg-white rounded-[12px] border border-slate-200 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#c5724a] focus:ring-2 focus:ring-[#c5724a]/10 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Password
            </label>
            <div className="relative flex items-center">
              <i className="ph ph-lock text-slate-400 text-lg absolute left-4"></i>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-12 bg-white rounded-[12px] border border-slate-200 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#c5724a] focus:ring-2 focus:ring-[#c5724a]/10 transition-all"
              />
            </div>
            <p className="text-xs font-medium text-slate-600 mt-2">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <i className="ph ph-lock text-slate-400 text-lg absolute left-4"></i>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-12 bg-white rounded-[12px] border border-slate-200 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#c5724a] focus:ring-2 focus:ring-[#c5724a]/10 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#c5724a] text-white text-sm font-bold uppercase tracking-wide rounded-[12px] shadow-lg shadow-[#c5724a]/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-8"
          >
            {isLoading ? (
              <>
                <i className="ph ph-circle-notch text-lg animate-spin"></i>
                Creating Account...
              </>
            ) : (
              <>
                <i className="ph-bold ph-user-plus text-lg"></i>
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Sign In Link */}
        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#c5724a] hover:text-[#b85f38] transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-6 flex flex-col items-center gap-3 z-10">
        <p className="text-xs font-medium text-slate-500">Powered By</p>
        <img 
          src="https://app-cdn.appgen.com/b3df0d9a-96ef-45eb-83f3-fc43af4afc56/assets/uploaded_1774212850662_hednh9.jpeg" 
          alt="MegaHertz Technologies" 
          className="h-8 object-contain"
        />
      </div>
    </div>
  );
}
