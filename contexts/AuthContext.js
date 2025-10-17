import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { AuthService } from '../services/authService';
import { StorageService } from '../utils/storage';

// Criar contexto
const AuthContext = createContext();

// Hook personalizado para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

// Provider do contexto
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  // Efeito para observar mudanças na autenticação
  useEffect(() => {
    console.log('Configurando observador de autenticação...');
    
    const unsubscribe = AuthService.onAuthStateChange(async (firebaseUser) => {
      console.log('Estado de autenticação alterado:', firebaseUser ? firebaseUser.uid : 'Nenhum usuário');
      
      try {
        if (firebaseUser) {
          // Usuário está logado
          console.log('Usuário logado detectado, buscando dados do professor...');
          
          const teacherResult = await AuthService.getTeacherData(firebaseUser.uid);
          
          if (teacherResult.success) {
            console.log('Dados do professor carregados com sucesso');
            
            // Combinar dados do Firebase Auth com dados do Firestore
            const completeUserData = {
              ...firebaseUser,
              ...teacherResult.data
            };
            
            setUser(completeUserData);
            setTeacherData(teacherResult.data);
            
            // Sincronizar dados ao fazer login
            console.log('Sincronizando dados com Firebase...');
            const syncResult = await StorageService.syncAllData();
            if (syncResult.success) {
              console.log('Sincronização concluída com sucesso');
            } else {
              console.warn('Aviso na sincronização:', syncResult.error);
            }
            
          } else {
            console.error('Dados do professor não encontrados, fazendo logout...');
            // Dados do professor não encontrados no Firestore
            await AuthService.logoutTeacher();
            setUser(null);
            setTeacherData(null);
            StorageService.clearCache();
          }
        } else {
          // Usuário deslogado
          console.log('Usuário deslogado, limpando dados...');
          setUser(null);
          setTeacherData(null);
          StorageService.clearCache();
        }
      } catch (error) {
        console.error('Erro no observador de autenticação:', error);
        setUser(null);
        setTeacherData(null);
        StorageService.clearCache();
      } finally {
        setLoading(false);
        if (isInitializing) {
          setIsInitializing(false);
        }
      }
    });

    // Cleanup function
    return () => {
      console.log('Removendo observador de autenticação');
      unsubscribe();
    };
  }, [isInitializing]);

  /**
   * Login do professor
   */
  const login = async (email, password) => {
    try {
      console.log('Iniciando processo de login...');
      setLoading(true);
      
      const result = await AuthService.loginTeacher(email, password);
      
      if (result.success) {
        console.log('Login bem-sucedido via AuthContext');
        // O observador de autenticação irá atualizar o estado automaticamente
        return { success: true };
      } else {
        console.error('Erro no login via AuthContext:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Erro inesperado no login:', error);
      return { success: false, error: 'Erro inesperado no login' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registro de novo professor
   */
  const register = async (email, password, teacherName) => {
    try {
      console.log('Iniciando processo de registro...');
      setLoading(true);
      
      const result = await AuthService.registerTeacher(email, password, teacherName);
      
      if (result.success) {
        console.log('Registro bem-sucedido via AuthContext');
        // O observador de autenticação irá atualizar o estado automaticamente
        return { success: true };
      } else {
        console.error('Erro no registro via AuthContext:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Erro inesperado no registro:', error);
      return { success: false, error: 'Erro inesperado no registro' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout do professor
   */
  const logout = async () => {
    try {
      console.log('Iniciando processo de logout...');
      setLoading(true);
      
      const result = await AuthService.logoutTeacher();
      
      if (result.success) {
        console.log('Logout bem-sucedido via AuthContext');
        // O observador de autenticação irá limpar o estado automaticamente
        return { success: true };
      } else {
        console.error('Erro no logout via AuthContext:', result.error);
        Alert.alert('Erro', 'Não foi possível fazer logout');
        return result;
      }
    } catch (error) {
      console.error('Erro inesperado no logout:', error);
      Alert.alert('Erro', 'Erro inesperado ao fazer logout');
      return { success: false, error: 'Erro inesperado no logout' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualizar dados do professor
   */
  const updateTeacherData = async (updates) => {
    try {
      if (!user) {
        throw new Error('Nenhum usuário logado');
      }
      
      const result = await AuthService.updateTeacherProfile(user.uid, updates);
      
      if (result.success) {
        // Atualizar estado local
        setTeacherData(prev => ({ ...prev, ...updates }));
        setUser(prev => ({ ...prev, ...updates }));
        return { success: true };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Erro ao atualizar dados do professor:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Recarregar dados do usuário
   */
  const reloadUserData = async () => {
    try {
      if (!user) {
        return { success: false, error: 'Nenhum usuário logado' };
      }
      
      const result = await AuthService.getTeacherData(user.uid);
      
      if (result.success) {
        setTeacherData(result.data);
        setUser(prev => ({ ...prev, ...result.data }));
        return { success: true };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Erro ao recarregar dados do usuário:', error);
      return { success: false, error: error.message };
    }
  };

  /**
   * Verificar se o usuário está autenticado
   */
  const isAuthenticated = () => {
    return !!user;
  };

  /**
   * Obter nome de exibição do professor
   */
  const getDisplayName = () => {
    return teacherData?.name || user?.email || 'Professor';
  };

  // Valor do contexto
  const value = {
    // Estado
    user,
    teacherData,
    loading,
    isInitializing,
    
    // Ações
    login,
    register,
    logout,
    updateTeacherData,
    reloadUserData,
    
    // Utilitários
    isAuthenticated,
    getDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}