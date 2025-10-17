import AsyncStorage from '@react-native-async-storage/async-storage';
import { DataService } from '../services/dataService';
import { AuthService } from '../services/authService';

// Chaves para cache local
const LOCAL_CACHE_KEYS = {
  CURRENT_CLASS: 'current_class',
  THEME: 'app_theme',
  LAST_SYNC: 'last_sync',
  TEACHER_SETTINGS: 'teacher_settings'
};

// Cache em memória
let memoryCache = {
  students: null,
  classes: null,
  currentClass: null,
  events: null,
  theme: null,
  settings: null
};

/**
 * Sistema híbrido de storage: Firebase + Cache local + Memória
 */
export class StorageService {
  
  // ========== FUNÇÕES DE CACHE ==========
  
  static clearCache() {
    console.log('Limpando cache em memória');
    memoryCache = {
      students: null,
      classes: null,
      currentClass: null,
      events: null,
      theme: null,
      settings: null
    };
  }

  static getFromCache(key) {
    return memoryCache[key];
  }

  static setToCache(key, value) {
    memoryCache[key] = value;
  }

  // ========== FUNÇÕES DE SINCRONIZAÇÃO ==========

  static async syncAllData() {
    try {
      console.log('Iniciando sincronização completa de dados...');
      
      const [classesResult, studentsResult, eventsResult] = await Promise.all([
        DataService.getClasses(),
        DataService.getStudents(),
        DataService.getEvents()
      ]);

      let syncSuccess = true;
      let syncErrors = [];

      if (classesResult.success) {
        this.setToCache('classes', classesResult.classes);
        console.log(`Sincronizadas ${classesResult.classes.length} turmas`);
      } else {
        syncSuccess = false;
        syncErrors.push(`Turmas: ${classesResult.error}`);
      }

      if (studentsResult.success) {
        this.setToCache('students', studentsResult.students);
        console.log(`Sincronizados ${studentsResult.students.length} alunos`);
      } else {
        syncSuccess = false;
        syncErrors.push(`Alunos: ${studentsResult.error}`);
      }

      if (eventsResult.success) {
        this.setToCache('events', eventsResult.events);
        console.log(`Sincronizados ${eventsResult.events.length} eventos`);
      } else {
        syncSuccess = false;
        syncErrors.push(`Eventos: ${eventsResult.error}`);
      }

      await AsyncStorage.setItem(LOCAL_CACHE_KEYS.LAST_SYNC, new Date().toISOString());
      
      if (syncSuccess) {
        console.log('Sincronização concluída com sucesso');
        return { 
          success: true, 
          classes: classesResult.classes || [],
          students: studentsResult.students || [],
          events: eventsResult.events || []
        };
      } else {
        console.warn('Sincronização com avisos:', syncErrors);
        return { 
          success: false, 
          error: syncErrors.join('; '),
          classes: classesResult.classes || [],
          students: studentsResult.students || [],
          events: eventsResult.events || []
        };
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      return { 
        success: false, 
        error: error.message,
        classes: [],
        students: [],
        events: []
      };
    }
  }

  static async getLastSync() {
    try {
      const lastSync = await AsyncStorage.getItem(LOCAL_CACHE_KEYS.LAST_SYNC);
      return lastSync ? new Date(lastSync) : null;
    } catch (error) {
      console.error('Erro ao obter última sincronização:', error);
      return null;
    }
  }

  // ========== FUNÇÕES DE TURMAS ==========

  static async saveClasses(classes) {
    try {
      console.log('Salvando coleção de turmas...');
      
      // Para cada turma, salvar no Firebase
      const savePromises = classes.map(cls => {
        if (cls.id) {
          return DataService.updateClass(cls.id, cls);
        } else {
          return DataService.saveClass(cls);
        }
      });

      const results = await Promise.all(savePromises);
      
      // Verificar se todos foram salvos com sucesso
      const allSuccess = results.every(result => result.success);
      
      if (allSuccess) {
        this.setToCache('classes', classes);
        console.log('Turmas salvas com sucesso');
        return { success: true };
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error);
        console.error('Erros ao salvar turmas:', errors);
        return { success: false, error: errors.join('; ') };
      }
    } catch (error) {
      console.error('Erro ao salvar turmas:', error);
      return { success: false, error: error.message };
    }
  }

  static async getClasses() {
    try {
      // Verificar cache primeiro
      const cached = this.getFromCache('classes');
      if (cached) {
        console.log('Retornando turmas do cache');
        return { success: true, classes: cached };
      }

      console.log('Buscando turmas do Firebase...');
      // Buscar do Firebase
      const result = await DataService.getClasses();
      if (result.success) {
        this.setToCache('classes', result.classes);
        console.log(`Retornadas ${result.classes.length} turmas do Firebase`);
      } else {
        console.warn('Falha ao buscar turmas do Firebase:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      return { success: false, error: error.message, classes: [] };
    }
  }

  static async saveClass(classData) {
    try {
      console.log('Salvando turma individual...');
      const result = await DataService.saveClass(classData);
      if (result.success) {
        // Atualizar cache
        const currentClasses = this.getFromCache('classes') || [];
        this.setToCache('classes', [...currentClasses, result.class]);
        console.log('Turma salva e cache atualizado');
      } else {
        console.error('Erro ao salvar turma:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateClass(classId, classData) {
    try {
      console.log(`Atualizando turma ${classId}...`);
      const result = await DataService.updateClass(classId, classData);
      if (result.success) {
        // Atualizar cache
        const currentClasses = this.getFromCache('classes') || [];
        const updatedClasses = currentClasses.map(cls =>
          cls.id === classId ? { ...cls, ...classData } : cls
        );
        this.setToCache('classes', updatedClasses);
        console.log('Turma atualizada e cache atualizado');
      } else {
        console.error('Erro ao atualizar turma:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao atualizar turma:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteClass(classId) {
    try {
      console.log(`Excluindo turma ${classId}...`);
      const result = await DataService.deleteClass(classId);
      if (result.success) {
        // Atualizar cache
        const currentClasses = this.getFromCache('classes') || [];
        const filteredClasses = currentClasses.filter(cls => cls.id !== classId);
        this.setToCache('classes', filteredClasses);
        console.log('Turma excluída e cache atualizado');
      } else {
        console.error('Erro ao excluir turma:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== FUNÇÕES DE ALUNOS ==========

  static async saveStudents(students) {
    try {
      console.log('Salvando coleção de alunos...');
      
      // Para cada aluno, salvar no Firebase
      const savePromises = students.map(student => {
        if (student.id) {
          return DataService.updateStudent(student.id, student);
        } else {
          return DataService.saveStudent(student);
        }
      });

      const results = await Promise.all(savePromises);
      
      // Verificar se todos foram salvos com sucesso
      const allSuccess = results.every(result => result.success);
      
      if (allSuccess) {
        this.setToCache('students', students);
        console.log('Alunos salvos com sucesso');
        return { success: true };
      } else {
        const errors = results.filter(r => !r.success).map(r => r.error);
        console.error('Erros ao salvar alunos:', errors);
        return { success: false, error: errors.join('; ') };
      }
    } catch (error) {
      console.error('Erro ao salvar alunos:', error);
      return { success: false, error: error.message };
    }
  }

  static async getStudents(classId = null) {
    try {
      const cacheKey = classId ? `students_${classId}` : 'students';
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log(`Retornando alunos do cache${classId ? ` para turma ${classId}` : ''}`);
        return { success: true, students: cached };
      }

      console.log(`Buscando alunos do Firebase${classId ? ` para turma ${classId}` : ''}...`);
      const result = await DataService.getStudents(classId);
      if (result.success) {
        this.setToCache(cacheKey, result.students);
        console.log(`Retornados ${result.students.length} alunos do Firebase`);
      } else {
        console.warn('Falha ao buscar alunos do Firebase:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      return { success: false, error: error.message, students: [] };
    }
  }

  static async saveStudent(studentData) {
    try {
      console.log('Salvando aluno individual...');
      const result = await DataService.saveStudent(studentData);
      if (result.success) {
        // Atualizar cache
        const currentStudents = this.getFromCache('students') || [];
        this.setToCache('students', [...currentStudents, result.student]);
        
        // Invalidar cache específico por turma se existir
        if (studentData.classId) {
          this.setToCache(`students_${studentData.classId}`, null);
        }
        
        console.log('Aluno salvo e cache atualizado');
      } else {
        console.error('Erro ao salvar aluno:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateStudent(studentId, studentData) {
    try {
      console.log(`Atualizando aluno ${studentId}...`);
      const result = await DataService.updateStudent(studentId, studentData);
      if (result.success) {
        // Atualizar cache
        const currentStudents = this.getFromCache('students') || [];
        const updatedStudents = currentStudents.map(student =>
          student.id === studentId ? { ...student, ...studentData } : student
        );
        this.setToCache('students', updatedStudents);
        
        // Invalidar cache específico por turma se existir
        if (studentData.classId) {
          this.setToCache(`students_${studentData.classId}`, null);
        }
        
        console.log('Aluno atualizado e cache atualizado');
      } else {
        console.error('Erro ao atualizar aluno:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao atualizar aluno:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteStudent(studentId) {
    try {
      console.log(`Excluindo aluno ${studentId}...`);
      
      // Primeiro obter o aluno para saber a turma
      const studentResult = await DataService.getStudent(studentId);
      let classId = null;
      
      if (studentResult.success) {
        classId = studentResult.student.classId;
      }
      
      const result = await DataService.deleteStudent(studentId);
      if (result.success) {
        // Atualizar cache
        const currentStudents = this.getFromCache('students') || [];
        const filteredStudents = currentStudents.filter(student => student.id !== studentId);
        this.setToCache('students', filteredStudents);
        
        // Invalidar cache específico por turma se existir
        if (classId) {
          this.setToCache(`students_${classId}`, null);
        }
        
        console.log('Aluno excluído e cache atualizado');
      } else {
        console.error('Erro ao excluir aluno:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao excluir aluno:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== FUNÇÕES DE EVENTOS ==========

  static async saveEvents(events) {
    try {
      this.setToCache('events', events);
      console.log('Eventos salvos no cache');
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar eventos:', error);
      return { success: false, error: error.message };
    }
  }

  static async getEvents() {
    try {
      const cached = this.getFromCache('events');
      if (cached) {
        console.log('Retornando eventos do cache');
        return { success: true, events: cached };
      }

      console.log('Buscando eventos do Firebase...');
      const result = await DataService.getEvents();
      if (result.success) {
        this.setToCache('events', result.events);
        console.log(`Retornados ${result.events.length} eventos do Firebase`);
      } else {
        console.warn('Falha ao buscar eventos do Firebase:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      return { success: false, error: error.message, events: [] };
    }
  }

  static async addEvent(event) {
    try {
      console.log('Adicionando evento...');
      const result = await DataService.saveEvent(event);
      if (result.success) {
        // Atualizar cache
        const currentEvents = this.getFromCache('events') || [];
        this.setToCache('events', [...currentEvents, result.event]);
        console.log('Evento adicionado e cache atualizado');
      } else {
        console.error('Erro ao adicionar evento:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao adicionar evento:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteEvent(eventId) {
    try {
      console.log(`Excluindo evento ${eventId}...`);
      const result = await DataService.deleteEvent(eventId);
      if (result.success) {
        // Atualizar cache
        const currentEvents = this.getFromCache('events') || [];
        const filteredEvents = currentEvents.filter(event => event.id !== eventId);
        this.setToCache('events', filteredEvents);
        console.log('Evento excluído e cache atualizado');
      } else {
        console.error('Erro ao excluir evento:', result.error);
      }
      return result;
    } catch (error) {
      console.error('Erro ao excluir evento:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== FUNÇÕES DE CONFIGURAÇÃO ==========

  static async saveCurrentClass(classId) {
    try {
      await AsyncStorage.setItem(LOCAL_CACHE_KEYS.CURRENT_CLASS, classId);
      this.setToCache('currentClass', classId);
      console.log('Turma atual salva:', classId);
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar turma atual:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCurrentClass() {
    try {
      const cached = this.getFromCache('currentClass');
      if (cached !== null && cached !== undefined) {
        return { success: true, classId: cached };
      }

      const classId = await AsyncStorage.getItem(LOCAL_CACHE_KEYS.CURRENT_CLASS);
      this.setToCache('currentClass', classId);
      console.log('Turma atual recuperada:', classId);
      
      return { success: true, classId };
    } catch (error) {
      console.error('Erro ao buscar turma atual:', error);
      return { success: false, error: error.message, classId: null };
    }
  }

  static async saveTheme(theme) {
    try {
      await AsyncStorage.setItem(LOCAL_CACHE_KEYS.THEME, theme);
      this.setToCache('theme', theme);
      console.log('Tema salvo:', theme);
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
      return { success: false, error: error.message };
    }
  }

  static async getTheme() {
    try {
      const cached = this.getFromCache('theme');
      if (cached) return { success: true, theme: cached };

      const theme = await AsyncStorage.getItem(LOCAL_CACHE_KEYS.THEME) || 'light';
      this.setToCache('theme', theme);
      console.log('Tema recuperado:', theme);
      
      return { success: true, theme };
    } catch (error) {
      console.error('Erro ao buscar tema:', error);
      return { success: false, error: error.message, theme: 'light' };
    }
  }

  static async saveTeacherSettings(settings) {
    try {
      const settingsString = JSON.stringify(settings);
      await AsyncStorage.setItem(LOCAL_CACHE_KEYS.TEACHER_SETTINGS, settingsString);
      this.setToCache('settings', settings);
      console.log('Configurações salvas');
      return { success: true };
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return { success: false, error: error.message };
    }
  }

  static async getTeacherSettings() {
    try {
      const cached = this.getFromCache('settings');
      if (cached) return { success: true, settings: cached };

      const settingsString = await AsyncStorage.getItem(LOCAL_CACHE_KEYS.TEACHER_SETTINGS);
      const settings = settingsString ? JSON.parse(settingsString) : {};
      this.setToCache('settings', settings);
      
      return { success: true, settings };
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return { success: false, error: error.message, settings: {} };
    }
  }

  // ========== FUNÇÕES DE BACKUP E RESTAURAÇÃO ==========

  static async createBackup() {
    try {
      console.log('Criando backup...');
      
      const [classesResult, studentsResult, eventsResult, currentClassResult] = await Promise.all([
        this.getClasses(),
        this.getStudents(),
        this.getEvents(),
        this.getCurrentClass()
      ]);

      const backupData = {
        classes: classesResult.classes || [],
        students: studentsResult.students || [],
        events: eventsResult.events || [],
        currentClass: currentClassResult.classId,
        backupDate: new Date().toISOString(),
        version: '2.0.0'
      };

      console.log('Backup criado com sucesso');
      return { success: true, backup: backupData };
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      return { success: false, error: error.message };
    }
  }

  static async clearAllData() {
    try {
      console.log('Limpando todos os dados...');
      
      this.clearCache();
      await AsyncStorage.multiRemove(Object.values(LOCAL_CACHE_KEYS));
      
      // Limpar dados do Firebase também
      const clearResult = await DataService.clearAllTeacherData();
      
      if (clearResult.success) {
        console.log('Todos os dados foram limpos com sucesso');
        return { success: true };
      } else {
        console.error('Erro ao limpar dados do Firebase:', clearResult.error);
        return clearResult;
      }
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== FUNÇÕES DE ANÁLISE E ESTATÍSTICAS ==========

  static async getClassStatistics(classId = null) {
    try {
      console.log(`Calculando estatísticas${classId ? ` para turma ${classId}` : ' gerais'}...`);
      
      const studentsResult = await this.getStudents(classId);
      if (!studentsResult.success) {
        throw new Error('Erro ao buscar alunos para estatísticas');
      }

      const classStudents = studentsResult.students;
      
      if (classStudents.length === 0) {
        console.log('Nenhum aluno encontrado para calcular estatísticas');
        return {
          totalStudents: 0,
          average: 0,
          approved: 0,
          recovery: 0,
          failed: 0,
          approvalRate: 0
        };
      }
      
      const totalStudents = classStudents.length;
      const totalAverage = classStudents.reduce((sum, student) => sum + student.average, 0) / totalStudents;
      
      const approved = classStudents.filter(student => student.average >= 7).length;
      const recovery = classStudents.filter(student => student.average >= 5 && student.average < 7).length;
      const failed = classStudents.filter(student => student.average < 5).length;
      
      const approvalRate = (approved / totalStudents) * 100;
      
      const statistics = {
        totalStudents,
        average: parseFloat(totalAverage.toFixed(2)),
        approved,
        recovery,
        failed,
        approvalRate: parseFloat(approvalRate.toFixed(1))
      };

      console.log('Estatísticas calculadas:', statistics);
      return statistics;
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
      return {
        totalStudents: 0,
        average: 0,
        approved: 0,
        recovery: 0,
        failed: 0,
        approvalRate: 0
      };
    }
  }

  // ========== FUNÇÕES DE BUSCA ==========

  static async searchStudents(query, classId = null) {
    try {
      console.log(`Buscando alunos: "${query}"${classId ? ` na turma ${classId}` : ''}`);
      const result = await DataService.searchStudents(query, classId);
      
      if (result.success) {
        console.log(`Encontrados ${result.students.length} alunos na busca`);
      } else {
        console.warn('Falha na busca de alunos:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Erro na busca de alunos:', error);
      return { success: false, error: error.message, students: [] };
    }
  }

  // ========== FUNÇÕES DE UTILITÁRIOS ==========

  static async getCurrentClassWithDetails() {
    try {
      const currentClassResult = await this.getCurrentClass();
      const classesResult = await this.getClasses();
      const studentsResult = await this.getStudents();

      if (!currentClassResult.classId) {
        console.log('Nenhuma turma atual definida');
        return null;
      }
      
      const currentClass = classesResult.classes.find(cls => cls.id === currentClassResult.classId);
      
      if (currentClass) {
        const studentCount = studentsResult.students.filter(student => student.classId === currentClassResult.classId).length;
        const classWithDetails = { ...currentClass, studentCount };
        console.log(`Turma atual com detalhes: ${classWithDetails.name} (${studentCount} alunos)`);
        return classWithDetails;
      }
      
      console.log('Turma atual não encontrada');
      return null;
    } catch (error) {
      console.error('Erro ao buscar turma atual com detalhes:', error);
      return null;
    }
  }

  static async updateClassStudentCount(classId) {
    try {
      console.log(`Atualizando contador de alunos para turma ${classId}`);
      const result = await DataService.updateClassStudentCount(classId);
      return result;
    } catch (error) {
      console.error('Erro ao atualizar contador de alunos:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateAllClassStudentCounts() {
    try {
      console.log('Atualizando contadores de todas as turmas...');
      const classesResult = await this.getClasses();
      
      if (classesResult.success) {
        const updatePromises = classesResult.classes.map(cls => 
          this.updateClassStudentCount(cls.id)
        );
        
        await Promise.all(updatePromises);
        console.log('Contadores de todas as turmas atualizados');
        return { success: true };
      } else {
        return { success: false, error: 'Erro ao buscar turmas' };
      }
    } catch (error) {
      console.error('Erro ao atualizar contadores de turmas:', error);
      return { success: false, error: error.message };
    }
  }

  static async preloadData() {
    try {
      console.log('Pré-carregando dados...');
      await Promise.all([
        this.getClasses(),
        this.getStudents(),
        this.getEvents(),
        this.getCurrentClass(),
        this.getTheme(),
        this.getTeacherSettings()
      ]);
      console.log('Pré-carregamento concluído');
      return { success: true };
    } catch (error) {
      console.error('Erro no pré-carregamento:', error);
      return { success: false, error: error.message };
    }
  }
}

// Exportar funções compatíveis com o código existente
export const {
  saveClasses,
  getClasses,
  saveStudents,
  getStudents,
  saveCurrentClass,
  getCurrentClass,
  saveEvents,
  getEvents,
  addEvent,
  deleteEvent,
  saveTheme,
  getTheme,
  clearAllData,
  getClassStatistics,
  searchStudents,
  getCurrentClassWithDetails,
  updateClassStudentCount,
  updateAllClassStudentCounts,
  preloadData
} = StorageService;

// Exportar funções auxiliares para compatibilidade
export const clearCache = () => StorageService.clearCache();
export const getFromCache = (key) => StorageService.getFromCache(key);
export const setToCache = (key, value) => StorageService.setToCache(key, value);

// Funções de análise (mantidas para compatibilidade)
export const analyzeStudentPerformance = async (studentId) => {
  // Implementação simplificada - em produção, isso usaria dados reais
  console.log(`Analisando desempenho do aluno ${studentId}`);
  return null;
};

export const analyzeClassPerformance = async (classId = null) => {
  console.log(`Analisando desempenho da turma ${classId || 'geral'}`);
  return null;
};

export const getRecentInsights = async (limit = 10) => {
  return [];
};

export const getStudentInsights = async (studentId) => {
  return [];
};

export const saveInsights = async (insights) => {
  return { success: true };
};

export const getInsights = async () => {
  return { success: true, insights: [] };
};

export const getStudentPerformanceData = async (classId = null) => {
  const studentsResult = await StorageService.getStudents(classId);
  if (studentsResult.success) {
    return studentsResult.students.map(student => ({
      name: student.name,
      average: student.average,
      status: student.average >= 7 ? 'Aprovado' : student.average >= 5 ? 'Recuperação' : 'Reprovado'
    })).sort((a, b) => b.average - a.average);
  }
  return [];
};

export const getClassComparisonData = async () => {
  const classesResult = await StorageService.getClasses();
  const studentsResult = await StorageService.getStudents();
  
  if (classesResult.success && studentsResult.success) {
    return classesResult.classes.map(classItem => {
      const classStudents = studentsResult.students.filter(student => student.classId === classItem.id);
      const average = classStudents.length > 0 
        ? classStudents.reduce((sum, student) => sum + student.average, 0) / classStudents.length 
        : 0;
      
      return {
        className: classItem.name,
        average: parseFloat(average.toFixed(2)),
        studentCount: classStudents.length,
        approved: classStudents.filter(s => s.average >= 7).length,
        recovery: classStudents.filter(s => s.average >= 5 && s.average < 7).length,
        failed: classStudents.filter(s => s.average < 5).length
      };
    }).filter(item => item.studentCount > 0);
  }
  return [];
};

export const getPerformanceDistribution = async (classId = null) => {
  const studentsResult = await StorageService.getStudents(classId);
  
  if (studentsResult.success) {
    const distribution = {
      '0-4.9': 0,
      '5-6.9': 0,
      '7-10': 0
    };
    
    studentsResult.students.forEach(student => {
      if (student.average < 5) {
        distribution['0-4.9']++;
      } else if (student.average < 7) {
        distribution['5-6.9']++;
      } else {
        distribution['7-10']++;
      }
    });
    
    const totalStudents = studentsResult.students.length;
    return Object.entries(distribution).map(([range, count]) => ({
      range,
      count,
      percentage: totalStudents > 0 ? (count / totalStudents) * 100 : 0
    }));
  }
  return [];
};

// Funções de backup (mantidas para compatibilidade)
export const createBackup = () => StorageService.createBackup();
export const getBackupInfo = async () => {
  const backupResult = await StorageService.createBackup();
  if (backupResult.success) {
    const backup = backupResult.backup;
    return {
      date: backup.backupDate,
      studentCount: backup.students?.length || 0,
      classCount: backup.classes?.length || 0,
      teacherName: 'Professor', // Será obtido do contexto
      eventCount: backup.events?.length || 0,
      insightCount: 0
    };
  }
  return null;
};

export const restoreBackup = async () => {
  // Em produção, isso restauraria de um backup real
  console.log('Funcionalidade de restauração de backup');
  return { success: true };
};

// Funções do professor (mantidas para compatibilidade)
export const saveTeacherName = async (name) => {
  // Esta função agora é gerenciada pelo AuthContext
  console.log('saveTeacherName chamada - use AuthContext instead');
  return { success: true };
};

export const getTeacherName = async () => {
  // Esta função agora é gerenciada pelo AuthContext
  console.log('getTeacherName chamada - use AuthContext instead');
  return null;
};

export const clearTeacherData = async () => {
  // Esta função agora é gerenciada pelo AuthContext
  console.log('clearTeacherData chamada - use AuthContext instead');
  return { success: true };
};

// Funções de busca (mantidas para compatibilidade)
export const searchClasses = async (query) => {
  const classesResult = await StorageService.getClasses();
  
  if (classesResult.success) {
    if (!query.trim()) {
      return classesResult.classes;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return classesResult.classes.filter(classItem =>
      classItem.name.toLowerCase().includes(searchTerm) ||
      classItem.subject.toLowerCase().includes(searchTerm)
    );
  }
  return [];
};

// Funções de performance (mantidas para compatibilidade)
export const batchSaveStudents = async (studentsArray) => {
  return StorageService.saveStudents(studentsArray);
};

// Exportar o serviço completo para uso direto
export default StorageService;