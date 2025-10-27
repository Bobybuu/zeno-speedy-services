// src/components/DebugCart.tsx (temporary)
import { useEffect } from 'react';
import { useCart } from '@/context/CartContext';

export const DebugCart = () => {
  const { state } = useCart(); // ✅ FIXED: Use state instead of cart and loading
  
  useEffect(() => {
    console.log('🔍 DEBUG - Cart state:', { 
      items: state.items,
      total: state.total,
      itemCount: state.itemCount,
      isSyncing: state.isSyncing,
      lastSynced: state.lastSynced
    });
    console.log('🔍 DEBUG - localStorage cart:', localStorage.getItem('zeno-cart'));
  }, [state]); // ✅ FIXED: Depend on state instead of cart and loading
  
  return null; // This component doesn't render anything
};