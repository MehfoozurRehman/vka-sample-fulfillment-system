import { AuthContext } from '@/providers/auth';
import { User } from '@/types';
import { useContext } from 'react';

export function useAuth() {
  const context = useContext(AuthContext) as User;

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
