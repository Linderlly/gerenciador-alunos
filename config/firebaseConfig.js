import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfj0rY24gXVrdmN067V7IE6nbGwqWSb64",
  authDomain: "gerenciador-alunos.firebaseapp.com",
  projectId: "gerenciador-alunos",
  storageBucket: "gerenciador-alunos.firebasestorage.app",
  messagingSenderId: "773232992307",
  appId: "1:773232992307:web:ec50cf46cdbb0480790346",
  measurementId: "G-38V3WM3KVJ"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;