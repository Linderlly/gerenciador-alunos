import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { AuthService } from './authService';

/**
 * Serviço para gerenciar dados no Firestore
 */
export class DataService {
  
  /**
   * Obter ID do usuário atual
   */
  static getCurrentUserId() {
    const userId = AuthService.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }
    return userId;
  }

  /**
   * SALVAR E OBTER TURMAS
   */

  // Salvar turma
  static async saveClass(classData) {
    try {
      const userId = this.getCurrentUserId();
      console.log('Salvando turma para usuário:', userId);
      
      const classRef = doc(collection(db, 'teachers', userId, 'classes'));
      
      const classWithMetadata = {
        ...classData,
        id: classRef.id,
        teacherId: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        studentCount: 0 // Inicializar contador
      };

      await setDoc(classRef, classWithMetadata);
      
      console.log('Turma salva com ID:', classRef.id);
      return { success: true, class: classWithMetadata };
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      return { success: false, error: error.message };
    }
  }

  // Obter todas as turmas do professor
  static async getClasses() {
    try {
      const userId = this.getCurrentUserId();
      console.log('Buscando turmas para usuário:', userId);
      
      const classesRef = collection(db, 'teachers', userId, 'classes');
      const q = query(classesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const classes = [];
      querySnapshot.forEach((doc) => {
        classes.push(doc.data());
      });

      console.log(`Encontradas ${classes.length} turmas`);
      return { success: true, classes };
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      return { success: false, error: error.message, classes: [] };
    }
  }

  // Obter turma específica
  static async getClass(classId) {
    try {
      const userId = this.getCurrentUserId();
      const classRef = doc(db, 'teachers', userId, 'classes', classId);
      const classSnap = await getDoc(classRef);
      
      if (classSnap.exists()) {
        return { success: true, class: classSnap.data() };
      } else {
        return { success: false, error: 'Turma não encontrada' };
      }
    } catch (error) {
      console.error('Erro ao buscar turma:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar turma
  static async updateClass(classId, classData) {
    try {
      const userId = this.getCurrentUserId();
      const classRef = doc(db, 'teachers', userId, 'classes', classId);
      
      await updateDoc(classRef, {
        ...classData,
        updatedAt: new Date().toISOString()
      });

      console.log('Turma atualizada:', classId);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar turma:', error);
      return { success: false, error: error.message };
    }
  }

  // Excluir turma
  static async deleteClass(classId) {
    try {
      const userId = this.getCurrentUserId();
      console.log('Excluindo turma:', classId, 'do usuário:', userId);
      
      const classRef = doc(db, 'teachers', userId, 'classes', classId);
      
      // Primeiro, excluir todos os alunos da turma
      await this.deleteStudentsByClass(classId);
      
      // Depois excluir a turma
      await deleteDoc(classRef);

      console.log('Turma excluída com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar contador de alunos da turma
  static async updateClassStudentCount(classId) {
    try {
      const userId = this.getCurrentUserId();
      const studentsResult = await this.getStudents(classId);
      
      if (studentsResult.success) {
        const studentCount = studentsResult.students.length;
        await this.updateClass(classId, { studentCount });
        console.log(`Contador de alunos atualizado para turma ${classId}: ${studentCount}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar contador de alunos:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * SALVAR E OBTER ALUNOS
   */

  // Salvar aluno
  static async saveStudent(studentData) {
    try {
      const userId = this.getCurrentUserId();
      console.log('Salvando aluno para usuário:', userId);
      
      const studentRef = doc(collection(db, 'teachers', userId, 'students'));
      
      // Calcular média
      const average = this.calculateAverage(studentData.notes);
      
      const studentWithMetadata = {
        ...studentData,
        id: studentRef.id,
        teacherId: userId,
        average: average,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      await setDoc(studentRef, studentWithMetadata);
      
      // Atualizar contador da turma
      await this.updateClassStudentCount(studentData.classId);
      
      console.log('Aluno salvo com ID:', studentRef.id);
      return { success: true, student: studentWithMetadata };
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      return { success: false, error: error.message };
    }
  }

  // Obter alunos (com filtro opcional por turma)
  static async getStudents(classId = null) {
    try {
      const userId = this.getCurrentUserId();
      console.log('Buscando alunos para usuário:', userId, classId ? `turma: ${classId}` : 'todas as turmas');
      
      const studentsRef = collection(db, 'teachers', userId, 'students');
      
      let q;
      if (classId) {
        q = query(studentsRef, where('classId', '==', classId), orderBy('createdAt', 'desc'));
      } else {
        q = query(studentsRef, orderBy('createdAt', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      
      const students = [];
      querySnapshot.forEach((doc) => {
        students.push(doc.data());
      });

      console.log(`Encontrados ${students.length} alunos`);
      return { success: true, students };
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      return { success: false, error: error.message, students: [] };
    }
  }

  // Obter aluno específico
  static async getStudent(studentId) {
    try {
      const userId = this.getCurrentUserId();
      const studentRef = doc(db, 'teachers', userId, 'students', studentId);
      const studentSnap = await getDoc(studentRef);
      
      if (studentSnap.exists()) {
        return { success: true, student: studentSnap.data() };
      } else {
        return { success: false, error: 'Aluno não encontrado' };
      }
    } catch (error) {
      console.error('Erro ao buscar aluno:', error);
      return { success: false, error: error.message };
    }
  }

  // Atualizar aluno
  static async updateStudent(studentId, studentData) {
    try {
      const userId = this.getCurrentUserId();
      const studentRef = doc(db, 'teachers', userId, 'students', studentId);
      
      // Calcular média se as notas foram alteradas
      const average = studentData.notes ? this.calculateAverage(studentData.notes) : undefined;
      
      const updateData = {
        ...studentData,
        updatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      if (average !== undefined) {
        updateData.average = average;
      }

      await updateDoc(studentRef, updateData);

      // Se a turma foi alterada, atualizar contadores
      if (studentData.classId) {
        await this.updateClassStudentCount(studentData.classId);
        
        // Também atualizar a turma anterior se necessário
        const oldStudent = await this.getStudent(studentId);
        if (oldStudent.success && oldStudent.student.classId !== studentData.classId) {
          await this.updateClassStudentCount(oldStudent.student.classId);
        }
      }
      
      console.log('Aluno atualizado:', studentId);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar aluno:', error);
      return { success: false, error: error.message };
    }
  }

  // Excluir aluno
  static async deleteStudent(studentId) {
    try {
      const userId = this.getCurrentUserId();
      console.log('Excluindo aluno:', studentId);
      
      // Primeiro obter o aluno para saber a turma
      const studentResult = await this.getStudent(studentId);
      if (!studentResult.success) {
        throw new Error('Aluno não encontrado');
      }
      
      const classId = studentResult.student.classId;
      const studentRef = doc(db, 'teachers', userId, 'students', studentId);
      
      await deleteDoc(studentRef);

      // Atualizar contador da turma
      await this.updateClassStudentCount(classId);
      
      console.log('Aluno excluído com sucesso');
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
      return { success: false, error: error.message };
    }
  }

  // Excluir todos os alunos de uma turma
  static async deleteStudentsByClass(classId) {
    try {
      const userId = this.getCurrentUserId();
      console.log('Excluindo alunos da turma:', classId);
      
      const studentsResult = await this.getStudents(classId);
      
      if (studentsResult.success) {
        const batch = writeBatch(db);
        
        studentsResult.students.forEach(student => {
          const studentRef = doc(db, 'teachers', userId, 'students', student.id);
          batch.delete(studentRef);
        });
        
        await batch.commit();
        console.log(`Excluídos ${studentsResult.students.length} alunos da turma ${classId}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir alunos da turma:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar alunos
  static async searchStudents(queryText, classId = null) {
    try {
      const studentsResult = await this.getStudents(classId);
      
      if (!studentsResult.success) {
        return { success: false, students: [] };
      }

      const searchTerm = queryText.toLowerCase().trim();
      const filteredStudents = studentsResult.students.filter(student =>
        student.name.toLowerCase().includes(searchTerm) ||
        (student.className && student.className.toLowerCase().includes(searchTerm))
      );

      return { success: true, students: filteredStudents };
    } catch (error) {
      console.error('Erro na busca de alunos:', error);
      return { success: false, error: error.message, students: [] };
    }
  }

  /**
   * EVENTOS DO CALENDÁRIO
   */

  // Salvar evento
  static async saveEvent(eventData) {
    try {
      const userId = this.getCurrentUserId();
      const eventRef = doc(collection(db, 'teachers', userId, 'events'));
      
      const eventWithMetadata = {
        ...eventData,
        id: eventRef.id,
        teacherId: userId,
        createdAt: new Date().toISOString()
      };

      await setDoc(eventRef, eventWithMetadata);
      return { success: true, event: eventWithMetadata };
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      return { success: false, error: error.message };
    }
  }

  // Obter eventos
  static async getEvents() {
    try {
      const userId = this.getCurrentUserId();
      const eventsRef = collection(db, 'teachers', userId, 'events');
      const q = query(eventsRef, orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const events = [];
      querySnapshot.forEach((doc) => {
        events.push(doc.data());
      });

      return { success: true, events };
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return { success: false, error: error.message, events: [] };
    }
  }

  // Excluir evento
  static async deleteEvent(eventId) {
    try {
      const userId = this.getCurrentUserId();
      const eventRef = doc(db, 'teachers', userId, 'events', eventId);
      
      await deleteDoc(eventRef);

      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * MÉTODOS AUXILIARES
   */

  // Calcular média das notas
  static calculateAverage(notes) {
    const validNotes = notes
      .map(note => parseFloat(note))
      .filter(note => !isNaN(note) && note >= 0 && note <= 10);
    
    if (validNotes.length === 0) return 0;
    
    const sum = validNotes.reduce((acc, note) => acc + note, 0);
    return parseFloat((sum / validNotes.length).toFixed(2));
  }

  // Validar notas
  static validateNotes(notes) {
    const validNotes = notes
      .map(note => parseFloat(note))
      .filter(note => !isNaN(note) && note >= 0 && note <= 10);
    
    if (validNotes.length === 0) {
      return { isValid: false, message: 'Por favor, insira pelo menos uma nota válida (0-10)' };
    }
    
    if (validNotes.some(note => note < 0 || note > 10)) {
      return { isValid: false, message: 'As notas devem estar entre 0 e 10' };
    }
    
    return { isValid: true, message: '' };
  }

  /**
   * BACKUP E DADOS GERAIS
   */

  // Obter todos os dados do professor para backup
  static async getAllTeacherData() {
    try {
      const [classesResult, studentsResult, eventsResult] = await Promise.all([
        this.getClasses(),
        this.getStudents(),
        this.getEvents()
      ]);

      return {
        success: true,
        data: {
          classes: classesResult.classes || [],
          students: studentsResult.students || [],
          events: eventsResult.events || [],
          backupDate: new Date().toISOString(),
          version: '2.0.0'
        }
      };
    } catch (error) {
      console.error('Erro ao obter dados para backup:', error);
      return { success: false, error: error.message };
    }
  }

  // Limpar todos os dados do professor
  static async clearAllTeacherData() {
    try {
      const userId = this.getCurrentUserId();
      
      // Obter todas as coleções
      const [classesResult, studentsResult, eventsResult] = await Promise.all([
        this.getClasses(),
        this.getStudents(),
        this.getEvents()
      ]);

      const batch = writeBatch(db);

      // Excluir todos os alunos
      studentsResult.students.forEach(student => {
        const studentRef = doc(db, 'teachers', userId, 'students', student.id);
        batch.delete(studentRef);
      });

      // Excluir todas as turmas
      classesResult.classes.forEach(classItem => {
        const classRef = doc(db, 'teachers', userId, 'classes', classItem.id);
        batch.delete(classRef);
      });

      // Excluir todos os eventos
      eventsResult.events.forEach(event => {
        const eventRef = doc(db, 'teachers', userId, 'events', event.id);
        batch.delete(eventRef);
      });

      await batch.commit();
      
      console.log('Todos os dados do professor foram limpos');
      return { success: true };
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      return { success: false, error: error.message };
    }
  }
}