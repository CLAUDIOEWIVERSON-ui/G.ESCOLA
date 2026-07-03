'use client';
import { createContext, useContext, useState } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'Administrador' | 'Instrutor' | 'Aluno';
  status: 'Ativo' | 'Inativo';
}

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isInstrutor: boolean;
  isAluno: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.role === 'Administrador';
  const isInstrutor = profile?.role === 'Instrutor';
  const isAluno = profile?.role === 'Aluno';
  
  const refreshProfile = async () => {};

  const value = { profile, loading, isAdmin, isInstrutor, isAluno, refreshProfile };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
