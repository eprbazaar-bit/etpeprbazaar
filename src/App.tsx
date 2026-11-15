import React from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { PublicWebsite } from './components/public/PublicWebsite';
import { AuthScreens } from './components/auth/AuthScreens';
import { BuyerPortal } from './components/portals/BuyerPortal';
import { SellerPortal } from './components/portals/SellerPortal';
import { FacilitatorPortal } from './components/portals/FacilitatorPortal';
import { AdminPortal } from './components/portals/AdminPortal';
import { ErrorAlertBanner, LogoMark, ToastContainer } from './components/ui/DesignSystem';

const AppRouter: React.FC = () => {
  const { role, publicPage, authLoading, connectionError, toasts, dismissToast } = useMarketplace();

  const authPages = new Set([
    'login',
    'login-error',
    'access-denied',
    'profile-completion',
    'password-reset',
  ]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center p-6 gap-4">
        <LogoMark />
        <div className="text-xs font-medium text-[#64748B]">Verifying your session...</div>
      </div>
    );
  }

  if (connectionError && role === 'public' && !authPages.has(publicPage)) {
    return (
      <div className="min-h-screen bg-[#F4F7FB]">
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <ErrorAlertBanner title="Service Connection Required" message={connectionError} />
        </div>
        <PublicWebsite />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  return (
    <>
      {role === 'buyer' ? (
        <BuyerPortal />
      ) : role === 'seller' ? (
        <SellerPortal />
      ) : role === 'facilitator' ? (
        <FacilitatorPortal />
      ) : role === 'admin' ? (
        <AdminPortal />
      ) : authPages.has(publicPage) ? (
        <PublicWebsite>
          <AuthScreens />
        </PublicWebsite>
      ) : (
        <PublicWebsite />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export default function App() {
  return (
    <MarketplaceProvider>
      <AppRouter />
    </MarketplaceProvider>
  );
}
