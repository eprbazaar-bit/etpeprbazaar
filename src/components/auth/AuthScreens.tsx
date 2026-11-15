import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, ShieldAlert, UserCheck } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Button, LogoMark, Modal } from '../ui/DesignSystem';

export const AuthScreens: React.FC = () => {
  const {
    publicPage,
    authUser,
    categories,
    pendingOnboardingRole,
    navigatePublic,
    signInGoogleForRole,
    signInStaffEmailPassword,
    sendFacilitatorPasswordReset,
    submitOnboardingProfile,
    logout,
    addToast,
  } = useMarketplace();

  const [facEmail, setFacEmail] = useState('');
  const [facPassword, setFacPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // First-time Company Profile Completion (Mandatory Mobile Number!)
  const [onboardingRoleChoice, setOnboardingRoleChoice] = useState<'buyer' | 'seller'>(
    pendingOnboardingRole || 'buyer'
  );
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState(authUser?.displayName || '');
  const [mobile, setMobile] = useState('');
  const [gstin, setGstin] = useState('');
  const [cin, setCin] = useState('');
  const [eprRegNo, setEprRegNo] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [recyclerType, setRecyclerType] = useState('Plastic Waste Processor (PWP)');
  const [dealingCategories, setDealingCategories] = useState<string[]>([]);
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const activeOnboardingCategories = categories.filter((c) => c.active);

  const toggleDealingCategory = (catId: string) => {
    setDealingCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleGoogleSignIn = async (target: 'buyer' | 'seller' | 'facilitator' | 'admin') => {
    setAuthError('');
    setLoadingRole(target);
    try {
      await signInGoogleForRole(target);
      if (target === 'admin') setAdminModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In failed.';
      setAuthError(msg);
      addToast({ type: 'error', title: 'Authentication Failed', description: msg });
    } finally {
      setLoadingRole(null);
    }
  };

  const handleFacilitatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(facEmail.trim())) {
      setAuthError('Please enter a valid authorised facilitator email address.');
      return;
    }
    if (facPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    setLoadingRole('facilitator');
    try {
      await signInStaffEmailPassword(facEmail, facPassword, 'facilitator');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid facilitator credentials.');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleAdminEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setLoadingRole('admin');
    try {
      await signInStaffEmailPassword(adminEmail, adminPass, 'admin');
      setAdminModalOpen(false);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid administrator credentials.');
    } finally {
      setLoadingRole(null);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    const digits = mobile.replace(/\D/g, '');
    if (companyName.trim().length < 2) {
      setProfileError('Registered company name must be at least 2 characters.');
      return;
    }
    if (contactPerson.trim().length < 2) {
      setProfileError('Authorized contact person name must be at least 2 characters.');
      return;
    }
    if (digits.length < 10 || mobile.trim().length > 20) {
      setProfileError('Please enter a valid 10-digit mandatory mobile number (max 20 characters).');
      return;
    }
    if (gstin.trim().length !== 15) {
      setProfileError('GSTIN must be exactly 15 characters.');
      return;
    }
    if (eprRegNo.trim().length < 3) {
      setProfileError('EPR Registration Number must be at least 3 characters.');
      return;
    }
    if (city.trim().length < 2 || stateName.trim().length < 2) {
      setProfileError('City and State must each be at least 2 characters.');
      return;
    }
    setSavingProfile(true);
    try {
      await submitOnboardingProfile({
        companyName,
        contactPerson,
        mobile,
        gstin,
        cin,
        eprRegNo,
        city,
        state: stateName,
        recyclerType: onboardingRoleChoice === 'seller' ? recyclerType : undefined,
        dealingCategories,
      });
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not save corporate profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (publicPage === 'login-error') {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white border border-[#FECDD3] rounded-lg p-6 text-center">
          <AlertCircle className="w-10 h-10 text-[#E11D48] mx-auto" />
          <h1 className="font-display text-xl font-bold text-[#0A172A] mt-3">Authentication Failed</h1>
          <p className="text-sm text-[#475569] mt-2">
            We could not verify your credentials or Google session. Please try again.
          </p>
          <div className="mt-5 flex justify-center">
            <Button variant="primary" onClick={() => navigatePublic('login')}>Return to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  if (publicPage === 'access-denied') {
    return (
      <div className="max-w-md mx-auto my-16 px-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-[#D97706] mx-auto" />
          <h1 className="font-display text-xl font-bold text-[#0A172A] mt-3">Access Denied (403)</h1>
          <p className="text-sm text-[#475569] mt-2">
            Your account is not authorised for the requested portal role. Privileged roles must be provisioned by
            an authorised administrator.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigatePublic('login')}>Switch Account</Button>
            <Button variant="secondary" onClick={() => navigatePublic('home')}>Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (publicPage === 'password-reset') {
    return (
      <div className="max-w-md mx-auto my-14 px-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <button
            type="button"
            onClick={() => navigatePublic('login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A] mb-4 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
          </button>
          <h1 className="font-display text-xl font-bold text-[#0A172A]">Facilitator Password Reset</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Only authorised facilitator staff accounts provisioned by Admin are eligible.
          </p>
          {resetSent ? (
            <div className="mt-4 p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-lg text-xs text-[#15803D]">
              Password reset instructions have been sent to <span className="font-mono font-semibold">{resetEmail}</span>.
            </div>
          ) : (
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthError('');
                try {
                  await sendFacilitatorPasswordReset(resetEmail);
                  setResetSent(true);
                } catch (err) {
                  setAuthError(err instanceof Error ? err.message : 'Unable to send reset email.');
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Authorised Email Address</label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="facilitator@eprbazaar.com"
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>
              {authError && (
                <div className="p-2.5 bg-[#FFE4E6] border border-[#FECDD3] rounded text-xs text-[#BE123C]">
                  {authError}
                </div>
              )}
              <Button type="submit" variant="primary" className="w-full">
                Send Reset Email
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (publicPage === 'profile-completion') {
    if (!authUser) {
      return (
        <div className="max-w-md mx-auto my-14 px-4">
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 text-center space-y-4">
            <h1 className="font-display text-xl font-bold text-[#0A172A]">Authentication Required</h1>
            <p className="text-xs text-[#64748B]">Please sign in with Google as a Buyer or Seller first.</p>
            <Button variant="primary" onClick={() => navigatePublic('login')}>Go to Login</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto my-10 px-4">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2 text-[#16A36A] text-xs font-semibold uppercase tracking-wider">
                <UserCheck className="w-4 h-4" /> First-Time Onboarding
              </div>
              <h1 className="font-display text-2xl font-bold text-[#0A172A] mt-1">Complete Company Profile</h1>
              <p className="text-xs text-[#64748B] font-mono mt-0.5">Signed in as: {authUser.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
          </div>

          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Account Role *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOnboardingRoleChoice('buyer')}
                  className={`h-10 rounded-lg border text-sm font-semibold cursor-pointer ${
                    onboardingRoleChoice === 'buyer'
                      ? 'bg-[#10233F] text-white border-[#10233F]'
                      : 'bg-white text-[#475569] border-[#CBD5E1]'
                  }`}
                >
                  EPR Credit Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingRoleChoice('seller')}
                  className={`h-10 rounded-lg border text-sm font-semibold cursor-pointer ${
                    onboardingRoleChoice === 'seller'
                      ? 'bg-[#16A36A] text-white border-[#16A36A]'
                      : 'bg-white text-[#475569] border-[#CBD5E1]'
                  }`}
                >
                  EPR Credit Seller
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Registered Company Name *</label>
                <input
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Authorized Contact Person *</label>
                <input
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Mobile Number (Mandatory) *
                </label>
                <input
                  required
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 98XXXXXXXX"
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">GSTIN (15 Characters) *</label>
                <input
                  required
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="27AABCU9603R1ZM"
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">EPR Registration Number *</label>
                <input
                  required
                  value={eprRegNo}
                  onChange={(e) => setEprRegNo(e.target.value)}
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">CIN / LLPIN (Optional)</label>
                <input
                  value={cin}
                  onChange={(e) => setCin(e.target.value.toUpperCase())}
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">City *</label>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">State *</label>
                <input
                  required
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
                />
              </div>
            </div>

            {onboardingRoleChoice === 'seller' && (
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Recycler / Processor Category *</label>
                <select
                  value={recyclerType}
                  onChange={(e) => setRecyclerType(e.target.value)}
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg bg-white"
                >
                  <option>Plastic Waste Processor (PWP)</option>
                  <option>Authorized E-Waste Recycler</option>
                  <option>Battery Waste Recycler</option>
                  <option>Tyre Waste Recycler</option>
                  <option>Used Oil Re-Refiner</option>
                </select>
              </div>
            )}

            {activeOnboardingCategories.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  EPR Categories for Automatic Email Alerts (Select all applicable)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                  {activeOnboardingCategories.map((cat) => {
                    const checked = dealingCategories.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer ${
                          checked
                            ? 'bg-white border-[#10233F] text-[#0A172A] font-semibold'
                            : 'bg-white/60 border-[#E2E8F0] text-[#475569]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDealingCategory(cat.id)}
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Receive instant category-based email notifications whenever matching{' '}
                  {onboardingRoleChoice === 'buyer' ? 'selling offers' : 'buying requirements'} are published.
                </p>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-[#FFE4E6] border border-[#FECDD3] rounded-lg text-xs text-[#BE123C]">
                {profileError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="submit" variant="primary" disabled={savingProfile}>
                {savingProfile ? 'Saving profile...' : 'Save Profile & Continue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center max-w-2xl mx-auto">
        <div className="flex justify-center mb-4">
          <LogoMark onClick={() => navigatePublic('home')} />
        </div>
        <div className="text-xs font-semibold uppercase tracking-[0.06em] text-[#64748B]">
          ETP – EPR Bazaar Portal Access
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0A172A] mt-1">
          Sign In to Your Trading Account
        </h1>
        <p className="mt-2 text-sm text-[#475569]">
          Corporate Buyers and Sellers sign in with Google. Authorised Facilitators and Administrators sign in with
          authorised Google accounts or protected company credentials.
        </p>
      </div>

      {authError && (
        <div className="max-w-2xl mx-auto p-3.5 bg-[#FFE4E6] border border-[#FECDD3] rounded-lg text-xs text-[#BE123C]">
          {authError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* BUYER LOGIN */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 flex flex-col justify-between shadow-[0_1px_2px_0_rgba(16,35,63,0.04)]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#1E3A8A]">
              Corporate Buyers (PIBOs / Producers)
            </div>
            <h2 className="font-display text-xl font-bold text-[#0A172A] mt-1.5">Buyer Login</h2>
            <p className="mt-2 text-sm text-[#475569] leading-relaxed">
              Submit EPR credit requirements, track matches, and respond to facilitated offers.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-[#475569]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" /> Google Sign-In only (no OTP)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" /> Mandatory mobile &amp; GSTIN onboarding
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-5 border-t border-[#F1F5F9]">
            <Button
              variant="primary"
              className="w-full"
              disabled={loadingRole !== null}
              onClick={() => handleGoogleSignIn('buyer')}
            >
              {loadingRole === 'buyer' ? 'Connecting to Google...' : 'Continue with Google'}
            </Button>
          </div>
        </div>

        {/* SELLER LOGIN */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 flex flex-col justify-between shadow-[0_1px_2px_0_rgba(16,35,63,0.04)]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#15803D]">
              Authorized Recyclers &amp; Processors
            </div>
            <h2 className="font-display text-xl font-bold text-[#0A172A] mt-1.5">Seller Login</h2>
            <p className="mt-2 text-sm text-[#475569] leading-relaxed">
              List verified EPR credit inventory, review matched buyer enquiries, and track settlements.
            </p>
            <ul className="mt-4 space-y-2 text-xs text-[#475569]">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" /> Google Sign-In only (no OTP)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A]" /> Admin-verified inventory publishing
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-5 border-t border-[#F1F5F9]">
            <Button
              variant="emerald"
              className="w-full"
              disabled={loadingRole !== null}
              onClick={() => handleGoogleSignIn('seller')}
            >
              {loadingRole === 'seller' ? 'Connecting to Google...' : 'Continue with Google'}
            </Button>
          </div>
        </div>

        {/* PORTAL FACILITATOR LOGIN */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6 flex flex-col justify-between shadow-[0_1px_2px_0_rgba(16,35,63,0.04)]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B]">
              Internal Trade Operations
            </div>
            <h2 className="font-display text-xl font-bold text-[#0A172A] mt-1.5">Portal Facilitator Login</h2>
            <p className="mt-1.5 text-xs text-[#64748B]">
              Restricted to authorised staff accounts provisioned by Admin.
            </p>

            <div className="mt-4">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={loadingRole !== null}
                onClick={() => handleGoogleSignIn('facilitator')}
              >
                {loadingRole === 'facilitator'
                  ? 'Verifying Google Account...'
                  : 'Continue with Authorised Google Account'}
              </Button>
            </div>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-[#E2E8F0]" />
              <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-[#94A3B8]">
                Or Staff Email &amp; Password
              </span>
              <div className="flex-grow border-t border-[#E2E8F0]" />
            </div>

            <form id="fac-login-form" className="space-y-3" onSubmit={handleFacilitatorSubmit}>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Authorised Email</label>
                <input
                  type="email"
                  required
                  value={facEmail}
                  onChange={(e) => setFacEmail(e.target.value)}
                  placeholder="name@eprbazaar.com"
                  className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#334155]">Password</label>
                  <button
                    type="button"
                    onClick={() => navigatePublic('password-reset')}
                    className="text-[11px] text-[#1E3A8A] hover:underline cursor-pointer"
                  >
                    Reset Password
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={facPassword}
                  onChange={(e) => setFacPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#1E3A8A]"
                />
              </div>
            </form>
          </div>
          <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
            <Button
              type="submit"
              form="fac-login-form"
              variant="secondary"
              className="w-full"
              disabled={loadingRole !== null}
            >
              {loadingRole === 'facilitator' ? 'Signing In...' : 'Sign In with Email & Password'}
            </Button>
          </div>
        </div>
      </div>

      {/* Protected Admin Access */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#10233F] text-white flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display text-sm font-semibold text-[#0A172A]">Administrator Protected Access</div>
            <div className="text-xs text-[#64748B]">
              Restricted to authorised Nyanvi Ecoclean Private Limited administrators.
            </div>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAdminModalOpen(true)}>
          Admin Protected Login
        </Button>
      </div>

      <Modal
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        title="Protected Administrator Authentication"
        subtitle="Sign in with your authorised administrator credentials"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Button
            variant="emerald"
            className="w-full"
            disabled={loadingRole !== null}
            onClick={() => handleGoogleSignIn('admin')}
          >
            {loadingRole === 'admin' ? 'Verifying...' : 'Continue with Authorised Google Account'}
          </Button>
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#E2E8F0]" />
            <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-[#94A3B8]">Or Email &amp; Password</span>
            <div className="flex-grow border-t border-[#E2E8F0]" />
          </div>
          <form onSubmit={handleAdminEmailSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@eprbazaar.com"
                className="w-full h-10 px-3 text-sm font-mono border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Password</label>
              <input
                type="password"
                required
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-[#CBD5E1] rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setAdminModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={loadingRole === 'admin'}>
                {loadingRole === 'admin' ? 'Authenticating...' : 'Sign In'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </section>
  );
};
