import AsyncStorage from '@react-native-async-storage/async-storage';

const TEACHER_KEY = 'teacher_name';
const STUDENTS_KEY = 'students_data';
const CLASSES_KEY = 'classes_data';
const CURRENT_CLASS_KEY = 'current_class';
const BACKUP_KEY = 'app_backup';
const EVENTS_KEY = 'calendar_events';
const THEME_KEY = 'app_theme';
const AI_INSIGHTS_KEY = 'ai_insights';

// Cache em memória para acesso rápido
let memoryCache = {
  students: null,
  classes: null,
  teacher: null,
  currentClass: null,
  events: null,
  theme: null,
  insights: null
};

// Funções de Cache
export const clearCache = () => {
  memoryCache = {
    students: null,
    classes: null,
    teacher: null,
    currentClass: null,
    events: null,
    theme: null,
    insights: null
  };
};

export const getFromCache = (key) => {
  return memoryCache[key];
};

export const setToCache = (key, value) => {
  memoryCache[key] = value;
};

// Funções do Tema
export const saveTheme = async (theme) => {
  try {
    await AsyncStorage.setItem(THEME_KEY, theme);
    setToCache('theme', theme);
    return true;
  } catch (error) {
    return false;
  }
};

export const getTheme = async () => {
  try {
    const cached = getFromCache('theme');
    if (cached !== null && cached !== undefined) return cached;
    
    const theme = await AsyncStorage.getItem(THEME_KEY);
    setToCache('theme', theme || 'light');
    return theme || 'light';
  } catch (error) {
    return 'light';
  }
};

// Funções otimizadas com cache
export const saveTeacherName = async (name) => {
  try {
    await AsyncStorage.setItem(TEACHER_KEY, name);
    setToCache('teacher', name);
    return true;
  } catch (error) {
    return false;
  }
};

export const getTeacherName = async () => {
  try {
    const cached = getFromCache('teacher');
    if (cached !== null && cached !== undefined) return cached;
    
    const name = await AsyncStorage.getItem(TEACHER_KEY);
    setToCache('teacher', name);
    return name;
  } catch (error) {
    return null;
  }
};

export const clearTeacherData = async () => {
  try {
    await AsyncStorage.removeItem(TEACHER_KEY);
    setToCache('teacher', null);
    return true;
  } catch (error) {
    return false;
  }
};

// Funções dos Alunos com cache e batch operations
export const saveStudents = async (students) => {
  try {
    await AsyncStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
    setToCache('students', students);
    return true;
  } catch (error) {
    return false;
  }
};

export const getStudents = async () => {
  try {
    const cached = getFromCache('students');
    if (cached !== null) return cached;
    
    const studentsJson = await AsyncStorage.getItem(STUDENTS_KEY);
    const students = studentsJson ? JSON.parse(studentsJson) : [];
    setToCache('students', students);
    return students;
  } catch (error) {
    return [];
  }
};

// Funções das Turmas otimizadas
export const saveClasses = async (classes) => {
  try {
    await AsyncStorage.setItem(CLASSES_KEY, JSON.stringify(classes));
    setToCache('classes', classes);
    return true;
  } catch (error) {
    return false;
  }
};

export const getClasses = async () => {
  try {
    const cached = getFromCache('classes');
    if (cached !== null) return cached;
    
    const classesJson = await AsyncStorage.getItem(CLASSES_KEY);
    const classes = classesJson ? JSON.parse(classesJson) : [];
    setToCache('classes', classes);
    return classes;
  } catch (error) {
    return [];
  }
};

export const saveCurrentClass = async (classId) => {
  try {
    await AsyncStorage.setItem(CURRENT_CLASS_KEY, classId);
    setToCache('currentClass', classId);
    return true;
  } catch (error) {
    return false;
  }
};

export const getCurrentClass = async () => {
  try {
    const cached = getFromCache('currentClass');
    if (cached !== null && cached !== undefined) return cached;
    
    const classId = await AsyncStorage.getItem(CURRENT_CLASS_KEY);
    setToCache('currentClass', classId);
    return classId;
  } catch (error) {
    return null;
  }
};

// Funções do Calendário
export const saveEvents = async (events) => {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    setToCache('events', events);
    return true;
  } catch (error) {
    return false;
  }
};

export const getEvents = async () => {
  try {
    const cached = getFromCache('events');
    if (cached !== null) return cached;
    
    const eventsJson = await AsyncStorage.getItem(EVENTS_KEY);
    const events = eventsJson ? JSON.parse(eventsJson) : [];
    setToCache('events', events);
    return events;
  } catch (error) {
    return [];
  }
};

export const addEvent = async (event) => {
  try {
    const events = await getEvents();
    const newEvent = {
      ...event,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    const updatedEvents = [...events, newEvent];
    await saveEvents(updatedEvents);
    return newEvent;
  } catch (error) {
    return null;
  }
};

export const deleteEvent = async (eventId) => {
  try {
    const events = await getEvents();
    const updatedEvents = events.filter(event => event.id !== eventId);
    await saveEvents(updatedEvents);
    return true;
  } catch (error) {
    return false;
  }
};

// Funções de Insights da IA
export const saveInsights = async (insights) => {
  try {
    await AsyncStorage.setItem(AI_INSIGHTS_KEY, JSON.stringify(insights));
    setToCache('insights', insights);
    return true;
  } catch (error) {
    return false;
  }
};

export const getInsights = async () => {
  try {
    const cached = getFromCache('insights');
    if (cached !== null) return cached;
    
    const insightsJson = await AsyncStorage.getItem(AI_INSIGHTS_KEY);
    const insights = insightsJson ? JSON.parse(insightsJson) : [];
    setToCache('insights', insights);
    return insights;
  } catch (error) {
    return [];
  }
};

// Funções Gerais Otimizadas
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([TEACHER_KEY, STUDENTS_KEY, CLASSES_KEY, CURRENT_CLASS_KEY, EVENTS_KEY, AI_INSIGHTS_KEY]);
    clearCache();
    return true;
  } catch (error) {
    return false;
  }
};

// Funções Auxiliares Otimizadas
export const updateClassStudentCount = async (classId) => {
  try {
    const [students, classes] = await Promise.all([getStudents(), getClasses()]);
    
    const studentCount = students.filter(student => student.classId === classId).length;
    
    const updatedClasses = classes.map(cls =>
      cls.id === classId ? { ...cls, studentCount } : cls
    );
    
    await saveClasses(updatedClasses);
    return true;
  } catch (error) {
    return false;
  }
};

export const updateAllClassStudentCounts = async () => {
  try {
    const [students, classes] = await Promise.all([getStudents(), getClasses()]);
    
    const classStudentCounts = students.reduce((acc, student) => {
      acc[student.classId] = (acc[student.classId] || 0) + 1;
      return acc;
    }, {});
    
    const updatedClasses = classes.map(cls => ({
      ...cls,
      studentCount: classStudentCounts[cls.id] || 0
    }));
    
    await saveClasses(updatedClasses);
    return true;
  } catch (error) {
    return false;
  }
};

export const getCurrentClassWithDetails = async () => {
  try {
    const [currentClassId, classes, students] = await Promise.all([
      getCurrentClass(),
      getClasses(),
      getStudents()
    ]);
    
    if (!currentClassId) return null;
    
    const currentClass = classes.find(cls => cls.id === currentClassId);
    
    if (currentClass) {
      const studentCount = students.filter(student => student.classId === currentClassId).length;
      return { ...currentClass, studentCount };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Funções de Análise Inteligente
export const getStudentPerformanceHistory = async (studentId) => {
  try {
    const students = await getStudents();
    const student = students.find(s => s.id === studentId);
    
    if (!student) return null;

    // Simular histórico (em um sistema real, isso viria do banco de dados)
    const currentAverage = student.average;
    const previousAverage = currentAverage * (0.85 + Math.random() * 0.3); // Simula variação
    
    return {
      currentAverage,
      previousAverage,
      changePercentage: ((currentAverage - previousAverage) / previousAverage) * 100,
      lastUpdate: student.lastModified || student.date,
      notesCount: student.notes.length,
      studentName: student.name
    };
  } catch (error) {
    return null;
  }
};

export const analyzeStudentPerformance = async (studentId) => {
  const history = await getStudentPerformanceHistory(studentId);
  if (!history) return null;

  const { currentAverage, previousAverage, changePercentage, lastUpdate, notesCount, studentName } = history;
  
  const analysis = {
    studentId,
    studentName,
    currentAverage,
    previousAverage,
    changePercentage: parseFloat(changePercentage.toFixed(1)),
    daysSinceLastUpdate: Math.floor((new Date() - new Date(lastUpdate)) / (1000 * 60 * 60 * 24)),
    notesCount,
    insights: [],
    recommendations: [],
    timestamp: new Date().toISOString()
  };

  // Análise de Queda de Desempenho
  if (changePercentage < -10) {
    analysis.insights.push({
      type: 'performance_drop',
      severity: 'medium',
      message: `Queda de ${Math.abs(changePercentage).toFixed(1)}% na média geral`,
      description: 'O aluno pode estar enfrentando dificuldades recentes',
      icon: '⚠️'
    });
    analysis.recommendations.push('Verificar possíveis dificuldades específicas');
    analysis.recommendations.push('Agendar uma conversa com o aluno');
  }

  // Análise de Progresso Significativo
  if (changePercentage > 15) {
    analysis.insights.push({
      type: 'significant_progress',
      severity: 'positive',
      message: `Melhora impressionante de ${changePercentage.toFixed(1)}%`,
      description: 'O aluno demonstra grande evolução no aprendizado',
      icon: '🎉'
    });
    analysis.recommendations.push('Parabenizar o aluno pelo progresso');
    analysis.recommendations.push('Manter o estímulo positivo');
  }

  // Análise de Desempenho Estável
  if (Math.abs(changePercentage) <= 5 && currentAverage >= 7) {
    analysis.insights.push({
      type: 'stable_performance',
      severity: 'positive',
      message: 'Desempenho consistente e estável',
      description: 'O aluno mantém um bom ritmo de aprendizado',
      icon: '📈'
    });
    analysis.recommendations.push('Continuar com o acompanhamento atual');
  }

  // Análise de Falta de Avaliações
  if (notesCount === 0) {
    analysis.insights.push({
      type: 'no_assessments',
      severity: 'high',
      message: 'Nenhuma nota lançada para este aluno',
      description: 'É necessário registrar as avaliações do aluno',
      icon: '❗'
    });
    analysis.recommendations.push('Registrar as notas das avaliações realizadas');
  } else if (notesCount < 3) {
    analysis.insights.push({
      type: 'few_assessments',
      severity: 'low',
      message: 'Poucas avaliações registradas',
      description: 'Considere aumentar a frequência de avaliações',
      icon: '📝'
    });
    analysis.recommendations.push('Aumentar a quantidade de avaliações formativas');
  }

  // Análise de Média Geral
  if (currentAverage >= 8) {
    analysis.insights.push({
      type: 'excellent_performance',
      severity: 'positive',
      message: 'Desempenho excelente',
      description: 'O aluno está entre os melhores da turma',
      icon: '⭐'
    });
    analysis.recommendations.push('Oferecer atividades de ampliação');
  } else if (currentAverage >= 7) {
    analysis.insights.push({
      type: 'good_performance',
      severity: 'positive',
      message: 'Bom desempenho',
      description: 'O aluno está no caminho certo',
      icon: '✅'
    });
  } else if (currentAverage < 5) {
    analysis.insights.push({
      type: 'low_performance',
      severity: 'high',
      message: 'Desempenho abaixo do esperado',
      description: 'O aluno precisa de apoio adicional',
      icon: '🔍'
    });
    analysis.recommendations.push('Implementar plano de recuperação');
    analysis.recommendations.push('Oferecer plantão de dúvidas');
  }

  // Análise de Tendência
  if (changePercentage > 5 && changePercentage <= 15) {
    analysis.insights.push({
      type: 'positive_trend',
      severity: 'positive',
      message: 'Tendência positiva de crescimento',
      description: 'O aluno está evoluindo consistentemente',
      icon: '🚀'
    });
  } else if (changePercentage < -5 && changePercentage >= -10) {
    analysis.insights.push({
      type: 'attention_needed',
      severity: 'low',
      message: 'Atenção: pequena queda no desempenho',
      description: 'Monitorar o desempenho nas próximas avaliações',
      icon: '👀'
    });
  }

  // Análise de Crescimento Consistente
  if (changePercentage > 0 && changePercentage <= 5) {
    analysis.insights.push({
      type: 'steady_growth',
      severity: 'positive',
      message: 'Crescimento constante',
      description: 'O aluno mostra progresso gradual',
      icon: '📊'
    });
  }

  return analysis;
};

export const analyzeClassPerformance = async (classId = null) => {
  try {
    const students = await getStudents();
    let classStudents = students;
    
    if (classId) {
      classStudents = students.filter(student => student.classId === classId);
    }

    const analyses = await Promise.all(
      classStudents.map(student => analyzeStudentPerformance(student.id))
    );

    const validAnalyses = analyses.filter(analysis => analysis !== null);
    
    const classInsights = {
      totalStudents: validAnalyses.length,
      averageClassPerformance: validAnalyses.reduce((sum, analysis) => sum + analysis.currentAverage, 0) / validAnalyses.length,
      studentsWithIssues: validAnalyses.filter(a => 
        a.insights.some(i => i.severity === 'high' || i.severity === 'medium')
      ).length,
      studentsExcelling: validAnalyses.filter(a => 
        a.insights.some(i => i.type === 'excellent_performance' || i.type === 'significant_progress')
      ).length,
      insights: validAnalyses.flatMap(a => a.insights.map(insight => ({
        ...insight,
        studentName: a.studentName,
        studentId: a.studentId
      }))),
      timestamp: new Date().toISOString()
    };

    // Salvar insights para notificações
    const existingInsights = await getInsights();
    const newInsight = {
      id: Date.now().toString(),
      type: 'class_analysis',
      classId,
      data: classInsights,
      timestamp: new Date().toISOString()
    };
    
    await saveInsights([...existingInsights, newInsight]);

    return classInsights;
  } catch (error) {
    console.log('Erro na análise da turma:', error);
    return null;
  }
};

export const getRecentInsights = async (limit = 10) => {
  try {
    const insights = await getInsights();
    return insights
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  } catch (error) {
    return [];
  }
};

export const getStudentInsights = async (studentId) => {
  try {
    const insights = await getInsights();
    return insights.filter(insight => 
      insight.data?.studentId === studentId || 
      insight.data?.insights?.some(i => i.studentId === studentId)
    );
  } catch (error) {
    return [];
  }
};

// Funções de Backup Otimizadas
export const createBackup = async () => {
  try {
    const [students, classes, teacherName, currentClass, events, insights] = await Promise.all([
      getStudents(),
      getClasses(),
      getTeacherName(),
      getCurrentClass(),
      getEvents(),
      getInsights()
    ]);
    
    const backupData = {
      students,
      classes,
      teacherName,
      currentClass,
      events,
      insights,
      backupDate: new Date().toISOString(),
      version: '2.2.0'
    };
    
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
    return backupData;
  } catch (error) {
    return null;
  }
};

export const restoreBackup = async () => {
  try {
    const backupJson = await AsyncStorage.getItem(BACKUP_KEY);
    if (!backupJson) return false;
    
    const backupData = JSON.parse(backupJson);
    
    await Promise.all([
      saveStudents(backupData.students || []),
      saveClasses(backupData.classes || []),
      backupData.teacherName ? saveTeacherName(backupData.teacherName) : Promise.resolve(),
      backupData.currentClass ? saveCurrentClass(backupData.currentClass) : Promise.resolve(),
      saveEvents(backupData.events || []),
      saveInsights(backupData.insights || [])
    ]);
    
    return true;
  } catch (error) {
    return false;
  }
};

export const getBackupInfo = async () => {
  try {
    const backupJson = await AsyncStorage.getItem(BACKUP_KEY);
    if (!backupJson) return null;
    
    const backupData = JSON.parse(backupJson);
    return {
      date: backupData.backupDate,
      studentCount: backupData.students?.length || 0,
      classCount: backupData.classes?.length || 0,
      teacherName: backupData.teacherName,
      eventCount: backupData.events?.length || 0,
      insightCount: backupData.insights?.length || 0
    };
  } catch (error) {
    return null;
  }
};

// Funções de Estatísticas Otimizadas
export const getClassStatistics = async (classId = null) => {
  try {
    const students = await getStudents();
    let classStudents = students;
    
    if (classId) {
      classStudents = students.filter(student => student.classId === classId);
    }
    
    if (classStudents.length === 0) {
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
    
    return {
      totalStudents,
      average: parseFloat(totalAverage.toFixed(2)),
      approved,
      recovery,
      failed,
      approvalRate: parseFloat(approvalRate.toFixed(1))
    };
  } catch (error) {
    return {
      totalStudents: 0,
      average: 0,
      approved: 0,
      recovery: 0,
      failed: 0,
      approvalRate: 0
    };
  }
};

// Novas funções para gráficos
export const getStudentPerformanceData = async (classId = null) => {
  try {
    const students = await getStudents();
    let filteredStudents = students;
    
    if (classId) {
      filteredStudents = students.filter(student => student.classId === classId);
    }
    
    const performanceData = filteredStudents.map(student => ({
      name: student.name,
      average: student.average,
      status: student.average >= 7 ? 'Aprovado' : student.average >= 5 ? 'Recuperação' : 'Reprovado'
    }));
    
    return performanceData.sort((a, b) => b.average - a.average);
  } catch (error) {
    return [];
  }
};

export const getClassComparisonData = async () => {
  try {
    const [students, classes] = await Promise.all([getStudents(), getClasses()]);
    
    const classData = classes.map(classItem => {
      const classStudents = students.filter(student => student.classId === classItem.id);
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
    });
    
    return classData.filter(item => item.studentCount > 0);
  } catch (error) {
    return [];
  }
};

export const getPerformanceDistribution = async (classId = null) => {
  try {
    const students = await getStudents();
    let filteredStudents = students;
    
    if (classId) {
      filteredStudents = students.filter(student => student.classId === classId);
    }
    
    const distribution = {
      '0-4.9': 0,
      '5-6.9': 0,
      '7-10': 0
    };
    
    filteredStudents.forEach(student => {
      if (student.average < 5) {
        distribution['0-4.9']++;
      } else if (student.average < 7) {
        distribution['5-6.9']++;
      } else {
        distribution['7-10']++;
      }
    });
    
    return Object.entries(distribution).map(([range, count]) => ({
      range,
      count,
      percentage: filteredStudents.length > 0 ? (count / filteredStudents.length) * 100 : 0
    }));
  } catch (error) {
    return [];
  }
};

// Funções de Busca Otimizadas
export const searchStudents = async (query, classId = null) => {
  try {
    const students = await getStudents();
    let filteredStudents = students;
    
    if (classId) {
      filteredStudents = students.filter(student => student.classId === classId);
    }
    
    if (!query.trim()) {
      return filteredStudents;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return filteredStudents.filter(student =>
      student.name.toLowerCase().includes(searchTerm) ||
      student.className.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    return [];
  }
};

export const searchClasses = async (query) => {
  try {
    const classes = await getClasses();
    
    if (!query.trim()) {
      return classes;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return classes.filter(classItem =>
      classItem.name.toLowerCase().includes(searchTerm) ||
      classItem.subject.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    return [];
  }
};

// Funções de Performance
export const batchSaveStudents = async (studentsArray) => {
  try {
    const currentStudents = await getStudents();
    const updatedStudents = [...currentStudents, ...studentsArray];
    await saveStudents(updatedStudents);
    return true;
  } catch (error) {
    return false;
  }
};

export const preloadData = async () => {
  try {
    await Promise.all([
      getStudents(),
      getClasses(),
      getTeacherName(),
      getCurrentClass(),
      getEvents(),
      getInsights()
    ]);
    return true;
  } catch (error) {
    return false;
  }
};