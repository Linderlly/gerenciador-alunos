// components/StudentAverages.js
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, ScrollView, Text, FlatList, Dimensions, RefreshControl } from 'react-native';
import { Card, Chip, ProgressBar, Button } from 'react-native-paper';
import { getStudents, getClasses, getCurrentClass, StorageService } from '../utils/storage';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

// Componentes memoizados
const StudentCard = memo(({ student, selectedClassId }) => {
  const getStatusColor = (average) => {
    if (average >= 7) return '#4caf50';
    if (average >= 5) return '#ff9800';
    return '#f44336';
  };

  const getStatusText = (average) => {
    if (average >= 7) return 'Aprovado';
    if (average >= 5) return 'Recuperação';
    return 'Reprovado';
  };

  const getStatusIcon = (average) => {
    if (average >= 7) return 'check-circle';
    if (average >= 5) return 'alert-circle';
    return 'close-circle';
  };

  return (
    <Card style={styles.studentCard}>
      <Card.Content style={styles.studentCardContent}>
        <View style={styles.studentHeader}>
          <Text style={styles.studentName} numberOfLines={1}>
            {student.name}
          </Text>
          <Chip 
            mode="outlined"
            textStyle={{ 
              color: getStatusColor(student.average),
              fontSize: isSmallScreen ? 11 : 12
            }}
            style={[styles.statusChip, { borderColor: getStatusColor(student.average) }]}
            icon={getStatusIcon(student.average)}
          >
            {getStatusText(student.average)}
          </Chip>
        </View>

        {!selectedClassId && (
          <Text style={styles.className} numberOfLines={1}>
            🏫 Turma: {student.className}
          </Text>
        )}

        <View style={styles.averageSection}>
          <Text style={styles.averageText}>
            📊 Média: {student.average}
          </Text>
          <ProgressBar 
            progress={student.average / 10} 
            color={getStatusColor(student.average)}
            style={styles.progressBar}
          />
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.notesTitle} numberOfLines={2}>
            📝 Notas: {student.notes.join(' | ')}
          </Text>
          <Text style={styles.dateText}>
            📅 Atualizado em: {student.date}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
});

const ClassChip = memo(({ classItem, isSelected, onPress }) => (
  <Chip
    selected={isSelected}
    onPress={onPress}
    style={[
      styles.classChip,
      isSelected && styles.selectedClassChip
    ]}
    mode="outlined"
    textStyle={{ fontSize: isSmallScreen ? 12 : 13 }}
    icon={isSelected ? 'check-circle' : 'circle-outline'}
  >
    {classItem.name}
  </Chip>
));

const StatisticsCard = memo(({ statistics, selectedClass }) => (
  <Card style={styles.statsCard}>
    <Card.Content>
      <Text style={styles.statsTitle}>
        {selectedClass ? `📈 Estatísticas - ${selectedClass.name}` : '📈 Estatísticas Gerais'}
      </Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{statistics.totalStudents}</Text>
          <Text style={styles.statLabel}>Total de Alunos</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{statistics.average}</Text>
          <Text style={styles.statLabel}>Média Geral</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statApproved]}>{statistics.approved}</Text>
          <Text style={styles.statLabel}>Aprovados</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statRecovery]}>{statistics.recovery}</Text>
          <Text style={styles.statLabel}>Recuperação</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statFailed]}>{statistics.failed}</Text>
          <Text style={styles.statLabel}>Reprovados</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.statRate]}>{statistics.approvalRate}%</Text>
          <Text style={styles.statLabel}>Taxa de Aprovação</Text>
        </View>
      </View>

      <ProgressBar 
        progress={statistics.approvalRate / 100} 
        color={getApprovalRateColor(statistics.approvalRate)}
        style={styles.approvalProgress}
      />
    </Card.Content>
  </Card>
));

// Função auxiliar para cor da taxa de aprovação
const getApprovalRateColor = (rate) => {
  if (rate >= 80) return '#4caf50';
  if (rate >= 60) return '#ff9800';
  return '#f44336';
};

function StudentAverages({ navigation }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    average: 0,
    approved: 0,
    recovery: 0,
    failed: 0,
    approvalRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Callbacks memoizados
  const loadStudents = useCallback(async () => {
    try {
      const loadedStudents = await getStudents();
      setStudents(loadedStudents);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const loadedClasses = await getClasses();
      setClasses(loadedClasses);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
    }
  }, []);

  const loadCurrentClass = useCallback(async () => {
    try {
      const currentClass = await getCurrentClass();
      setCurrentClassId(currentClass || '');
      setSelectedClassId(currentClass || '');
    } catch (error) {
      console.error('Erro ao carregar turma atual:', error);
      setCurrentClassId('');
      setSelectedClassId('');
    }
  }, []);

  const calculateClassAverage = useCallback((classStudents) => {
    if (classStudents.length === 0) return 0;
    const total = classStudents.reduce((sum, student) => sum + student.average, 0);
    return (total / classStudents.length).toFixed(2);
  }, []);

  const calculateStatistics = useCallback((classStudents) => {
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
  }, []);

  const getClassStudents = useCallback(() => {
    if (selectedClassId) {
      return students.filter(student => student.classId === selectedClassId);
    }
    return students;
  }, [students, selectedClassId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadStudents(), loadClasses()]);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadStudents, loadClasses]);

  // Efeitos otimizados
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadStudents(), loadClasses(), loadCurrentClass()]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadStudents, loadClasses, loadCurrentClass]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStudents();
      loadClasses();
      loadCurrentClass();
    });

    return unsubscribe;
  }, [navigation, loadStudents, loadClasses, loadCurrentClass]);

  // Atualizar estatísticas quando alunos ou turma selecionada mudar
  useEffect(() => {
    const classStudents = getClassStudents();
    const newStatistics = calculateStatistics(classStudents);
    setStatistics(newStatistics);
  }, [students, selectedClassId, getClassStudents, calculateStatistics]);

  // Dados memoizados para performance
  const classStudents = useMemo(() => getClassStudents(), [getClassStudents]);
  const selectedClass = useMemo(() => classes.find(cls => cls.id === selectedClassId), [classes, selectedClassId]);

  const renderStudentItem = useCallback(({ item }) => (
    <StudentCard 
      student={item} 
      selectedClassId={selectedClassId}
    />
  ), [selectedClassId]);

  const keyExtractor = useCallback((item) => item.id, []);

  const renderClassChip = useCallback(({ item }) => (
    <ClassChip
      classItem={item}
      isSelected={selectedClassId === item.id}
      onPress={() => setSelectedClassId(item.id)}
    />
  ), [selectedClassId]);

  const classKeyExtractor = useCallback((item) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Card style={styles.loadingCard}>
          <Card.Content>
            <Text style={styles.loadingText}>Carregando médias...</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
      >
        {/* Cartão de Estatísticas */}
        <StatisticsCard statistics={statistics} selectedClass={selectedClass} />

        {/* Seletor de Turmas */}
        <Card style={styles.selectorCard}>
          <Card.Content>
            <Text style={styles.selectorTitle}>
              🏫 Selecionar Turma
            </Text>
            
            {classes.length > 0 && (
              <FlatList
                data={[{ id: '', name: 'Todas as Turmas' }, ...classes]}
                keyExtractor={classKeyExtractor}
                renderItem={renderClassChip}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.classChipsContainer}
                initialNumToRender={5}
                maxToRenderPerBatch={3}
                windowSize={3}
              />
            )}

            {selectedClass && (
              <Text style={styles.selectedClassInfo}>
                ✅ Visualizando: <Text style={styles.selectedClassName}>{selectedClass.name}</Text>
                {selectedClass.subject && ` - ${selectedClass.subject}`}
              </Text>
            )}

            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('ChartsScreen')}
              style={styles.chartsButton}
              icon="chart-bar"
              contentStyle={styles.buttonContent}
            >
              Ver Gráficos Detalhados
            </Button>
          </Card.Content>
        </Card>

        {/* Lista de Alunos */}
        <Card style={styles.listCard}>
          <Card.Content>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                👥 Médias dos Alunos
              </Text>
              <Text style={styles.listCount}>
                {classStudents.length} {classStudents.length === 1 ? 'aluno' : 'alunos'}
              </Text>
            </View>

            {classStudents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>
                  {selectedClass 
                    ? `Nenhum aluno cadastrado na turma ${selectedClass?.name}.`
                    : 'Nenhum aluno cadastrado.'
                  }
                </Text>
                <Text style={styles.emptySubtext}>
                  {selectedClass 
                    ? 'Vá para "Gerenciar Alunos" para adicionar alunos a esta turma.'
                    : 'Vá para "Gerenciar Alunos" para adicionar alunos.'
                  }
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('StudentManager')}
                  style={styles.addButton}
                  icon="account-plus"
                  contentStyle={styles.buttonContent}
                >
                  Gerenciar Alunos
                </Button>
              </View>
            ) : (
              <FlatList
                data={classStudents}
                keyExtractor={keyExtractor}
                renderItem={renderStudentItem}
                scrollEnabled={false}
                initialNumToRender={8}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                updateCellsBatchingPeriod={50}
              />
            )}
          </Card.Content>
        </Card>

        {/* Legenda de Status */}
        <Card style={styles.legendCard}>
          <Card.Content>
            <Text style={styles.legendTitle}>🎯 Legenda de Status</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#4caf50' }]} />
                <Text style={styles.legendText}>Aprovado (≥ 7.0)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#ff9800' }]} />
                <Text style={styles.legendText}>Recuperação (5.0 - 6.9)</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: '#f44336' }]} />
                <Text style={styles.legendText}>{`Reprovado (<= 5.0)`}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: isSmallScreen ? 8 : 10,
    backgroundColor: '#f6f6f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f6f6f6',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  scrollContent: {
    flexGrow: 1,
  },
  statsCard: {
    marginBottom: isSmallScreen ? 12 : 16,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  statsTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 12 : 15,
    color: '#000000',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: isSmallScreen ? 8 : 10,
    marginBottom: isSmallScreen ? 10 : 12,
  },
  statItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: isSmallScreen ? 8 : 10,
  },
  statNumber: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#2196f3',
    marginBottom: 4,
  },
  statApproved: {
    color: '#4caf50',
  },
  statRecovery: {
    color: '#ff9800',
  },
  statFailed: {
    color: '#f44336',
  },
  statRate: {
    color: '#2196f3',
  },
  statLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 12 : 14,
  },
  approvalProgress: {
    height: isSmallScreen ? 6 : 8,
    borderRadius: 4,
    marginTop: isSmallScreen ? 6 : 8,
  },
  selectorCard: {
    marginBottom: isSmallScreen ? 12 : 16,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  selectorTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 10 : 12,
    color: '#000000',
  },
  classChipsContainer: {
    gap: isSmallScreen ? 6 : 8,
    paddingVertical: isSmallScreen ? 4 : 5,
    paddingHorizontal: isSmallScreen ? 8 : 10,
  },
  classChip: {
    marginRight: isSmallScreen ? 6 : 8,
  },
  selectedClassChip: {
    backgroundColor: '#2196f3',
  },
  selectedClassInfo: {
    fontSize: isSmallScreen ? 12 : 14,
    marginTop: isSmallScreen ? 8 : 10,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  selectedClassName: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  chartsButton: {
    marginTop: isSmallScreen ? 10 : 12,
  },
  listCard: {
    marginBottom: isSmallScreen ? 16 : 20,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 12 : 15,
  },
  listTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  listCount: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 30 : 40,
  },
  emptyIcon: {
    fontSize: isSmallScreen ? 48 : 56,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  emptyText: {
    fontSize: isSmallScreen ? 16 : 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: isSmallScreen ? 8 : 10,
    fontWeight: '600',
    lineHeight: isSmallScreen ? 22 : 24,
  },
  emptySubtext: {
    fontSize: isSmallScreen ? 14 : 16,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginBottom: isSmallScreen ? 16 : 20,
    lineHeight: isSmallScreen ? 18 : 20,
  },
  addButton: {
    marginTop: isSmallScreen ? 8 : 10,
  },
  buttonContent: {
    height: isSmallScreen ? 44 : 48,
  },
  studentCard: {
    marginBottom: isSmallScreen ? 8 : 10,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 8 : 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  studentCardContent: {
    padding: isSmallScreen ? 12 : 16,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 4 : 5,
  },
  studentName: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#000000',
    marginRight: isSmallScreen ? 8 : 10,
  },
  className: {
    fontSize: isSmallScreen ? 13 : 14,
    marginBottom: isSmallScreen ? 6 : 8,
    fontStyle: 'italic',
    color: '#666',
  },
  statusChip: {
    marginLeft: isSmallScreen ? 8 : 10,
  },
  averageSection: {
    marginBottom: isSmallScreen ? 8 : 10,
  },
  averageText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    marginBottom: isSmallScreen ? 4 : 5,
    color: '#000000',
  },
  progressBar: {
    height: isSmallScreen ? 6 : 8,
    borderRadius: 4,
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: isSmallScreen ? 8 : 10,
  },
  notesTitle: {
    fontSize: isSmallScreen ? 14 : 16,
    marginBottom: isSmallScreen ? 4 : 5,
    color: '#000000',
    lineHeight: isSmallScreen ? 18 : 20,
  },
  dateText: {
    fontSize: isSmallScreen ? 12 : 14,
    fontStyle: 'italic',
    color: '#666',
  },
  legendCard: {
    marginBottom: isSmallScreen ? 16 : 20,
    backgroundColor: '#f8f9fa',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  legendTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 10 : 12,
    color: '#000000',
    textAlign: 'center',
  },
  legendItems: {
    gap: isSmallScreen ? 8 : 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: isSmallScreen ? 12 : 16,
    height: isSmallScreen ? 12 : 16,
    borderRadius: isSmallScreen ? 6 : 8,
    marginRight: isSmallScreen ? 8 : 12,
  },
  legendText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#000000',
  },
});

export default memo(StudentAverages);