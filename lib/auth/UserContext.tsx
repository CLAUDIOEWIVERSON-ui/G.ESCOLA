'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  nome?: string;
  nome_guerra?: string;
  posto_graduacao?: string;
  role: 'admin' | 'instrutor' | 'aluno' | 'convidado';
  foto_url?: string;
  om?: string;
  nip?: string;
  turma_id?: string;
  student_id?: string;
  has_changed_password?: boolean;
  grupo_responsavel?: string;
}

interface UserContextType {
  profile: UserProfile | null;
  authLoading: boolean;
  isAdmin: boolean;
  isInstrutor: boolean;
  isAluno: boolean;
  isConvidado: boolean;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  profile: null,
  authLoading: false,
  isAdmin: true,
  isInstrutor: false,
  isAluno: false,
  isConvidado: false,
  refreshProfile: async () => {},
  logout: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>({
    id: 'admin-default',
    email: 'admin@escola.mil',
    full_name: 'Administrador do Sistema',
    role: 'admin',
    has_changed_password: true,
    posto_graduacao: 'Coordenação Geral',
  });
  const [authLoading, setAuthLoading] = useState(false);

  const refreshProfile = async () => {};
  const logout = async () => {};

  const role = profile?.role || 'admin';
  const isAdmin = role === 'admin';
  const isInstrutor = role === 'instrutor';
  const isAluno = role === 'aluno';
  const isConvidado = role === 'convidado';

  return (
    <UserContext.Provider
      value={{
        profile,
        authLoading,
        isAdmin,
        isInstrutor,
        isAluno,
        isConvidado,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
