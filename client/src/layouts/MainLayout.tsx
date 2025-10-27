import React, { ReactNode } from 'react';
import { useCart } from '@/context/CartContext';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  
  const { state } = useCart(); // ✅ FIXED: Use state instead of cartItemCount
  
  // ✅ FIXED: Get cartItemCount from state
  const cartItemCount = state?.itemCount || 0;

  // Your layout implementation
  return (
    <div className="main-layout">
      {/* You can use cartItemCount here in your layout */}
      {children}
    </div>
  );
};

export default MainLayout;