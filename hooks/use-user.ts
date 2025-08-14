import { AuthContext } from '@/providers/auth';
import { AuthUser } from '@/types';
import { useContext } from 'react';

export function useAuth() {
  return useContext(AuthContext) as AuthUser;
}
