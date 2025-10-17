import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

/**
 * Serviço de autenticação e gerenciamento de usuários
 */
export class AuthService {
  
  /**
   * Registrar novo professor
   */
  static async registerTeacher(email, password, teacherName) {
    try {
      console.log('Iniciando registro para:', email);
      
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('Usuário criado no Auth, UID:', user.uid);

      // Criar documento do professor no Firestore
      const teacherData = {
        uid: user.uid,
        email: email,
        name: teacherName,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        isActive: true
      };

      await setDoc(doc(db, 'teachers', user.uid), teacherData);

      console.log('Documento do professor criado no Firestore');

      return { success: true, user: { ...user, name: teacherName } };
    } catch (error) {
      console.error('Erro completo no registro:', error);
      let errorMessage = 'Erro ao criar conta';
      
      // Tratamento de erros específicos do Firebase
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email já está em uso.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Login do professor
   */
  static async loginTeacher(email, password) {
    try {
      console.log('Tentando login para:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('Login bem-sucedido, UID:', user.uid);

      // Atualizar último login
      await updateDoc(doc(db, 'teachers', user.uid), {
        lastLogin: new Date().toISOString()
      });

      // Buscar dados completos do professor
      const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));
      const teacherData = teacherDoc.exists() ? teacherDoc.data() : null;

      return { 
        success: true, 
        user: { ...user, ...teacherData } 
      };
    } catch (error) {
      console.error('Erro completo no login:', error);
      let errorMessage = 'Erro ao fazer login';
      
      // Tratamento de erros específicos do Firebase
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuário não encontrado.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Senha incorreta.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Erro de conexão. Verifique sua internet.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Tente novamente mais tarde.';
      } else {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Logout do professor
   */
  static async logoutTeacher() {
    try {
      console.log('Fazendo logout...');
      await signOut(auth);
      console.log('Logout bem-sucedido');
      return { success: true };
    } catch (error) {
      console.error('Erro no logout:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obter dados do professor
   */
  static async getTeacherData(uid) {
    try {
      console.log('Buscando dados do professor:', uid);
      const docRef = doc(db, 'teachers', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log('Dados do professor encontrados');
        return { success: true, data: docSnap.data() };
      } else {
        console.log('Professor não encontrado no Firestore');
        return { success: false, error: 'Professor não encontrado' };
      }
    } catch (error) {
      console.error('Erro ao buscar dados do professor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Observador de estado de autenticação
   */
  static onAuthStateChange(callback) {
    console.log('Configurando observador de autenticação');
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Obter usuário atual
   */
  static getCurrentUser() {
    const user = auth.currentUser;
    console.log('Usuário atual:', user ? user.uid : 'Nenhum');
    return user;
  }

  /**
   * Atualizar perfil do professor
   */
  static async updateTeacherProfile(uid, updates) {
    try {
      console.log('Atualizando perfil do professor:', uid);
      await updateDoc(doc(db, 'teachers', uid), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verificar se usuário está logado
   */
  static isUserLoggedIn() {
    return !!auth.currentUser;
  }

  /**
   * Obter ID do usuário atual
   */
  static getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.uid : null;
  }
}