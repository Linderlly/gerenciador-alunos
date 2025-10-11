import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { View, StyleSheet, ScrollView, Text, FlatList, Dimensions } from 'react-native';
import { Card, Chip, ProgressBar } from 'react-native-paper';
import { getStudents, getClasses, getCurrentClass } from '../utils/storage';

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
          >
            {getStatusText(student.average)}
          </Chip>
        </View>

        {!selectedClassId && (
          <Text style={styles.className} numberOfLines={1}>
            Turma: {student.className}
          </Text>
        )}

        <View style={styles.averageSection}>
          <Text style={styles.averageText}>
            Média: {student.average}
          </Text>
          <ProgressBar 
            progress={student.average / 10} 
            color={getStatusColor(student.average)}
            style={styles.progressBar}
          />
        </View>

        <View style={styles.notesSection}>
          <Text style={styles.notesTitle} numberOfLines={1}>
            Notas: {student.notes.join(' | ')}
          </Text>
          <Text style={styles.dateText}>
            Atualizado em: {student.date}
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
  >
    {classItem.name}
  </Chip>
));

function StudentAverages({ navigation }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  // Callbacks memoizados
  const loadStudents = useCallback(async () => {
    const loadedStudents = await getStudents();
    setStudents(loadedStudents);
  }, []);

  const loadClasses = useCallback(async () => {
    const loadedClasses = await getClasses();
    setClasses(loadedClasses);
  }, []);

  const loadCurrentClass = useCallback(async () => {
    const currentClass = await getCurrentClass();
    setCurrentClassId(currentClass || '');
    setSelectedClassId(currentClass || '');
  }, []);

  const calculateClassAverage = useCallback((classStudents) => {
    if (classStudents.length === 0) return 0;
    const total = classStudents.reduce((sum, student) => sum + student.average, 0);
    return (total / classStudents.length).toFixed(2);
  }, []);

  const getClassStudents = useCallback(() => {
    if (selectedClassId) {
      return students.filter(student => student.classId === selectedClassId);
    }
    return students;
  }, [students, selectedClassId]);

  // Efeitos otimizados
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadStudents(), loadClasses(), loadCurrentClass()]);
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

  // Dados memoizados para performance
  const classStudents = useMemo(() => getClassStudents(), [getClassStudents]);
  const classAverage = useMemo(() => calculateClassAverage(classStudents), [classStudents, calculateClassAverage]);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.summaryTitle}>
              {selectedClass ? `Turma: ${selectedClass.name}` : 'Todas as Turmas'}
            </Text>
            
            {classes.length > 0 && (
              <View style={styles.classSelection}>
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
              </View>
            )}

            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {classStudents.length}
                </Text>
                <Text style={styles.statLabel}>
                  Total de Alunos
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {classAverage}
                </Text>
                <Text style={styles.statLabel}>
                  Média da Turma
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.listCard}>
          <Card.Content>
            <Text style={styles.listTitle}>
              Médias Individuais
            </Text>

            {classStudents.length === 0 ? (
              <Text style={styles.emptyText}>
                {selectedClass 
                  ? `Nenhum aluno cadastrado na turma ${selectedClass?.name}.`
                  : 'Nenhum aluno cadastrado. Vá para "Gerenciar Alunos" para adicionar alunos.'
                }
              </Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  summaryCard: {
    marginBottom: isSmallScreen ? 12 : 16,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  summaryTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 12 : 15,
    color: '#000000',
  },
  classSelection: {
    marginBottom: isSmallScreen ? 12 : 15,
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
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: isSmallScreen ? 28 : 32,
    fontWeight: 'bold',
    color: '#2196f3',
  },
  statLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
  },
  listCard: {
    marginBottom: isSmallScreen ? 16 : 20,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  listTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 12 : 15,
    color: '#000000',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: isSmallScreen ? 16 : 20,
    color: '#666',
    fontSize: isSmallScreen ? 14 : 16,
    lineHeight: isSmallScreen ? 20 : 22,
  },
  studentCard: {
    marginBottom: isSmallScreen ? 8 : 10,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 8 : 10,
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
  },
  dateText: {
    fontSize: isSmallScreen ? 12 : 14,
    fontStyle: 'italic',
    color: '#666',
  },
});

export default memo(StudentAverages);