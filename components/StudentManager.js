import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  RefreshControl,
  FlatList,
  Dimensions
} from 'react-native';
import { TextInput, Button, Card, List, IconButton, Chip, Searchbar, Menu, Divider } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { getStudents, saveStudents, getClasses, getCurrentClass, updateClassStudentCount, searchStudents, DataService } from '../utils/storage';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

// Componentes memoizados
const StudentCard = memo(({ student, onEdit, onDelete, getStatusColor, getStatusText, getStatusIcon }) => (
  <Card style={styles.studentCard} mode="outlined">
    <Card.Content style={styles.studentCardContent}>
      <View style={styles.studentHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName} numberOfLines={1}>
            👤 {student.name}
          </Text>
          <Text style={styles.studentDetails} numberOfLines={1}>
            🏫 {student.className} • 📊 Média: {student.average}
          </Text>
          <View style={styles.statusContainer}>
            <Chip 
              mode="outlined"
              textStyle={{ 
                color: getStatusColor(student.average), 
                fontWeight: 'bold',
                fontSize: isSmallScreen ? 11 : 12
              }}
              style={[styles.statusChip, { borderColor: getStatusColor(student.average) }]}
              icon={getStatusIcon(student.average)}
            >
              {getStatusText(student.average)}
            </Chip>
          </View>
          <Text style={styles.studentNotes} numberOfLines={1}>
            📝 Notas: {student.notes.join(' | ')}
          </Text>
          <Text style={styles.studentDate}>
            📅 {student.date}
          </Text>
        </View>
        
        <View style={styles.actions}>
          <IconButton
            icon="pencil"
            size={isSmallScreen ? 18 : 20}
            iconColor="#2196f3"
            onPress={() => onEdit(student)}
            style={styles.actionButton}
          />
          <IconButton
            icon="delete"
            size={isSmallScreen ? 18 : 20}
            iconColor="#f44336"
            onPress={() => onDelete(student)}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Card.Content>
  </Card>
));

const NoteField = memo(({ note, index, onUpdate, onRemove, showRemove }) => (
  <View style={styles.noteRow}>
    <TextInput
      label={`Nota ${index + 1}`}
      value={note}
      onChangeText={(value) => onUpdate(index, value)}
      style={styles.noteInput}
      mode="outlined"
      keyboardType="decimal-pad"
      placeholder="0.0"
      left={<TextInput.Icon icon="numeric" />}
    />
    {showRemove && (
      <IconButton
        icon="delete"
        size={isSmallScreen ? 18 : 20}
        onPress={() => onRemove(index)}
        style={styles.deleteNoteButton}
      />
    )}
  </View>
));

const SkeletonLoader = memo(() => (
  <Card style={styles.listCard}>
    <Card.Content>
      <View style={[styles.skeleton, { width: '60%', height: isSmallScreen ? 20 : 24, marginBottom: isSmallScreen ? 12 : 16 }]} />
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={[styles.skeleton, { height: isSmallScreen ? 70 : 80, marginBottom: isSmallScreen ? 10 : 12, borderRadius: 8 }]} />
      ))}
    </Card.Content>
  </Card>
));

function StudentManager({ navigation }) {
  const { getDisplayName } = useAuth();
  
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [currentNotes, setCurrentNotes] = useState(['']);
  const [selectedClass, setSelectedClass] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [saving, setSaving] = useState(false);

  // Callbacks memoizados
  const loadInitialData = useCallback(async () => {
    try {
      await Promise.all([loadStudents(), loadClasses(), loadCurrentClass()]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const loadedStudents = await getStudents();
      setStudents(loadedStudents);
      setFilteredStudents(loadedStudents);
    } catch (error) {
      console.error('Erro ao carregar alunos:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de alunos');
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
      setSelectedClass(currentClass || '');
      setFilterClass(currentClass || '');
    } catch (error) {
      console.error('Erro ao carregar turma atual:', error);
      setCurrentClassId('');
      setSelectedClass('');
      setFilterClass('');
    }
  }, []);

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

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query);
    try {
      const results = await searchStudents(query, filterClass);
      const sortedResults = sortStudents(results, sortBy);
      setFilteredStudents(sortedResults);
    } catch (error) {
      console.error('Erro na busca:', error);
    }
  }, [filterClass, sortBy]);

  const sortStudents = useCallback((studentList, sortType) => {
    const sorted = [...studentList];
    switch (sortType) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'average':
        return sorted.sort((a, b) => b.average - a.average);
      case 'class':
        return sorted.sort((a, b) => a.className.localeCompare(b.className));
      case 'date':
        return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      default:
        return sorted;
    }
  }, []);

  const handleSort = useCallback((sortType) => {
    setSortBy(sortType);
    setSortMenuVisible(false);
  }, []);

  const addNoteField = useCallback(() => {
    setCurrentNotes(prev => [...prev, '']);
  }, []);

  const updateNote = useCallback((index, value) => {
    setCurrentNotes(prev => {
      const newNotes = [...prev];
      newNotes[index] = value.replace(',', '.');
      return newNotes;
    });
  }, []);

  const removeNoteField = useCallback((index) => {
    if (currentNotes.length > 1) {
      setCurrentNotes(prev => prev.filter((_, i) => i !== index));
    }
  }, [currentNotes.length]);

  const calculateAverage = useCallback((notes) => {
    const validNotes = notes
      .map(note => parseFloat(note))
      .filter(note => !isNaN(note) && note >= 0 && note <= 10);
    
    if (validNotes.length === 0) return 0;
    
    const sum = validNotes.reduce((acc, note) => acc + note, 0);
    return (sum / validNotes.length).toFixed(2);
  }, []);

  const getStatusColor = useCallback((average) => {
    if (average >= 7) return '#4caf50';
    if (average >= 5) return '#ff9800';
    return '#f44336';
  }, []);

  const getStatusText = useCallback((average) => {
    if (average >= 7) return 'Aprovado';
    if (average >= 5) return 'Recuperação';
    return 'Reprovado';
  }, []);

  const getStatusIcon = useCallback((average) => {
    if (average >= 7) return 'check-circle';
    if (average >= 5) return 'alert-circle';
    return 'close-circle';
  }, []);

  const validateNotes = useCallback((notes) => {
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
  }, []);

  const saveStudent = useCallback(async () => {
    if (studentName.trim() === '') {
      Alert.alert('Atenção', 'Por favor, insira o nome do aluno');
      return;
    }

    if (!selectedClass) {
      Alert.alert('Atenção', 'Por favor, selecione uma turma');
      return;
    }

    const notesValidation = validateNotes(currentNotes);
    if (!notesValidation.isValid) {
      Alert.alert('Atenção', notesValidation.message);
      return;
    }

    setSaving(true);

    try {
      const average = calculateAverage(currentNotes);
      const selectedClassObj = classes.find(cls => cls.id === selectedClass);
      
      const studentData = {
        name: studentName.trim(),
        notes: currentNotes.map(note => parseFloat(note)),
        average: parseFloat(average),
        classId: selectedClass,
        className: selectedClassObj ? selectedClassObj.name : 'Sem turma',
        date: new Date().toLocaleDateString('pt-BR')
      };

      let result;
      if (editingStudent) {
        result = await DataService.updateStudent(editingStudent.id, studentData);
      } else {
        result = await DataService.saveStudent(studentData);
      }

      if (result.success) {
        // Recarregar a lista de alunos
        await loadStudents();
        
        // Limpar formulário
        setStudentName('');
        setCurrentNotes(['']);
        setEditingStudent(null);

        Alert.alert(
          '✅ Sucesso',
          editingStudent ? 'Aluno atualizado com sucesso!' : 'Aluno adicionado com sucesso!'
        );
      } else {
        Alert.alert('❌ Erro', result.error || 'Não foi possível salvar o aluno');
      }
    } catch (error) {
      console.error('Erro ao salvar aluno:', error);
      Alert.alert('❌ Erro', 'Ocorreu um erro ao salvar o aluno');
    } finally {
      setSaving(false);
    }
  }, [studentName, selectedClass, currentNotes, editingStudent, classes, validateNotes, calculateAverage, loadStudents]);

  const editStudent = useCallback((student) => {
    setStudentName(student.name);
    setCurrentNotes(student.notes.map(note => note.toString()));
    setSelectedClass(student.classId);
    setEditingStudent(student);
  }, []);

  const deleteStudent = useCallback((studentToDelete) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir o aluno "${studentToDelete.name}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel'
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DataService.deleteStudent(studentToDelete.id);
              
              if (result.success) {
                await loadStudents();
                Alert.alert('✅ Sucesso', `Aluno "${studentToDelete.name}" excluído com sucesso!`);
              } else {
                Alert.alert('❌ Erro', result.error || 'Não foi possível excluir o aluno');
              }
            } catch (error) {
              console.error('Erro ao excluir aluno:', error);
              Alert.alert('❌ Erro', 'Ocorreu um erro ao excluir o aluno');
            }
          },
        },
      ]
    );
  }, [loadStudents]);

  // Efeitos otimizados
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStudents();
      loadClasses();
      loadCurrentClass();
    });

    return unsubscribe;
  }, [navigation, loadStudents, loadClasses, loadCurrentClass]);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [students, sortBy, handleSearch, searchQuery]);

  // Dados memoizados para performance
  const filterClassObj = useMemo(() => 
    classes.find(cls => cls.id === filterClass), 
    [classes, filterClass]
  );

  const selectedClassObj = useMemo(() => 
    classes.find(cls => cls.id === selectedClass), 
    [classes, selectedClass]
  );

  const averagePreview = useMemo(() => 
    calculateAverage(currentNotes), 
    [currentNotes, calculateAverage]
  );

  const hasValidNotes = useMemo(() => 
    currentNotes.some(note => note.trim() !== ''), 
    [currentNotes]
  );

  const renderStudentItem = useCallback(({ item }) => (
    <StudentCard
      student={item}
      onEdit={editStudent}
      onDelete={deleteStudent}
      getStatusColor={getStatusColor}
      getStatusText={getStatusText}
      getStatusIcon={getStatusIcon}
    />
  ), [editStudent, deleteStudent, getStatusColor, getStatusText, getStatusIcon]);

  const keyExtractor = useCallback((item) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonLoader />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
      >
        {/* Barra de Busca e Filtros */}
        <Card style={styles.searchCard}>
          <Card.Content>
            <Searchbar
              placeholder="Buscar alunos por nome ou turma..."
              onChangeText={handleSearch}
              value={searchQuery}
              style={styles.searchBar}
              icon="magnify"
            />
            
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterChips}>
                  <Chip
                    selected={filterClass === ''}
                    onPress={() => setFilterClass('')}
                    style={[
                      styles.filterChip,
                      filterClass === '' && styles.selectedFilterChip
                    ]}
                    mode="outlined"
                    icon="format-list-bulleted"
                    textStyle={{ fontSize: isSmallScreen ? 12 : 13 }}
                  >
                    Todas as Turmas
                  </Chip>
                  {classes.map((classItem) => (
                    <Chip
                      key={classItem.id}
                      selected={filterClass === classItem.id}
                      onPress={() => setFilterClass(classItem.id)}
                      style={[
                        styles.filterChip,
                        filterClass === classItem.id && styles.selectedFilterChip
                      ]}
                      mode="outlined"
                      icon="account-multiple"
                      textStyle={{ fontSize: isSmallScreen ? 12 : 13 }}
                    >
                      {classItem.name}
                    </Chip>
                  ))}
                </View>
              </ScrollView>
              
              <Menu
                visible={sortMenuVisible}
                onDismiss={() => setSortMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="sort"
                    size={isSmallScreen ? 20 : 24}
                    onPress={() => setSortMenuVisible(true)}
                    style={styles.sortButton}
                  />
                }
              >
                <Menu.Item 
                  onPress={() => handleSort('name')} 
                  title="Ordenar por Nome"
                  leadingIcon={sortBy === 'name' ? 'check' : 'sort-alphabetical-ascending'}
                />
                <Menu.Item 
                  onPress={() => handleSort('average')} 
                  title="Ordenar por Média"
                  leadingIcon={sortBy === 'average' ? 'check' : 'sort-numeric-descending'}
                />
                <Menu.Item 
                  onPress={() => handleSort('class')} 
                  title="Ordenar por Turma"
                  leadingIcon={sortBy === 'class' ? 'check' : 'account-multiple'}
                />
                <Menu.Item 
                  onPress={() => handleSort('date')} 
                  title="Ordenar por Data"
                  leadingIcon={sortBy === 'date' ? 'check' : 'calendar'}
                />
              </Menu>
            </View>

            {filterClassObj && (
              <Text style={styles.filterInfo}>
                📊 Mostrando alunos da turma: <Text style={styles.filterClassName}>{filterClassObj.name}</Text>
                {searchQuery && ` • Busca: "${searchQuery}"`}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Formulário de Aluno */}
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              {editingStudent ? '✏️ Editar Aluno' : '👨‍🎓 Adicionar Novo Aluno'}
            </Text>

            <TextInput
              label="Nome do Aluno"
              value={studentName}
              onChangeText={setStudentName}
              style={styles.input}
              mode="outlined"
              placeholder="Digite o nome completo do aluno"
              left={<TextInput.Icon icon="account" />}
            />

            {classes.length > 0 ? (
              <View style={styles.classSelection}>
                <Text style={styles.classLabel}>
                  🏫 Turma do Aluno:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.classChips}>
                    {classes.map((classItem) => (
                      <Chip
                        key={classItem.id}
                        selected={selectedClass === classItem.id}
                        onPress={() => setSelectedClass(classItem.id)}
                        style={[
                          styles.classChip,
                          selectedClass === classItem.id && styles.selectedClassChip
                        ]}
                        mode="outlined"
                        icon="check"
                        textStyle={{ fontSize: isSmallScreen ? 12 : 13 }}
                      >
                        {classItem.name}
                      </Chip>
                    ))}
                  </View>
                </ScrollView>
                
                {selectedClassObj && (
                  <Text style={styles.selectedClassInfo}>
                    ✅ Turma selecionada: <Text style={styles.selectedClassName}>{selectedClassObj.name}</Text> - {selectedClassObj.subject}
                  </Text>
                )}
              </View>
            ) : (
              <Card style={styles.noClassesCard} mode="outlined">
                <Card.Content>
                  <Text style={styles.noClassesText}>
                    🏫 Nenhuma turma criada
                  </Text>
                  <Text style={styles.noClassesSubtext}>
                    Crie uma turma primeiro para adicionar alunos
                  </Text>
                  <Button 
                    mode="contained" 
                    onPress={() => navigation.navigate('ClassManager')}
                    style={styles.createClassButton}
                    icon="account-multiple-plus"
                    contentStyle={styles.buttonContent}
                  >
                    Criar Turma
                  </Button>
                </Card.Content>
              </Card>
            )}

            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>
                📝 Notas:
              </Text>
              
              {currentNotes.map((note, index) => (
                <NoteField
                  key={index}
                  note={note}
                  index={index}
                  onUpdate={updateNote}
                  onRemove={removeNoteField}
                  showRemove={currentNotes.length > 1}
                />
              ))}

              <Button 
                mode="outlined" 
                onPress={addNoteField}
                style={styles.addNoteButton}
                icon="plus"
                contentStyle={styles.buttonContent}
              >
                Adicionar Campo de Nota
              </Button>

              {hasValidNotes && (
                <View style={styles.averagePreview}>
                  <Text style={styles.averagePreviewText}>
                    📊 Média calculada: <Text style={styles.averagePreviewNumber}>
                      {averagePreview}
                    </Text>
                  </Text>
                </View>
              )}
            </View>

            <Button 
              mode="contained" 
              onPress={saveStudent}
              style={styles.saveButton}
              disabled={!studentName.trim() || !selectedClass || saving}
              loading={saving}
              contentStyle={styles.buttonContent}
            >
              {editingStudent ? '💾 Atualizar Aluno' : '✅ Salvar Aluno'}
            </Button>

            {editingStudent && (
              <Button 
                mode="outlined" 
                onPress={() => {
                  setStudentName('');
                  setCurrentNotes(['']);
                  setSelectedClass(currentClassId);
                  setEditingStudent(null);
                }}
                style={styles.cancelButton}
                contentStyle={styles.buttonContent}
                disabled={saving}
              >
                ❌ Cancelar Edição
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Lista de Alunos com FlatList otimizada */}
        <Card style={styles.listCard}>
          <Card.Content>
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {filterClassObj 
                    ? `👥 Alunos da Turma: ${filterClassObj.name}` 
                    : '👥 Todos os Alunos'
                  } 
                </Text>
                <Text style={styles.listSubtitle}>
                  {filteredStudents.length} {filteredStudents.length === 1 ? 'aluno encontrado' : 'alunos encontrados'}
                  {sortBy !== 'name' && ` • Ordenado por ${getSortLabel(sortBy)}`}
                </Text>
              </View>
            </View>

            {filteredStudents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyText}>
                  {searchQuery || filterClass 
                    ? 'Nenhum aluno encontrado com os filtros atuais'
                    : 'Nenhum aluno cadastrado ainda'
                  }
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || filterClass 
                    ? 'Tente ajustar os filtros de busca'
                    : 'Adicione alunos usando o formulário acima'
                  }
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={keyExtractor}
                renderItem={renderStudentItem}
                scrollEnabled={false}
                initialNumToRender={10}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                updateCellsBatchingPeriod={50}
              />
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getSortLabel = (sortType) => {
  switch (sortType) {
    case 'name': return 'Nome';
    case 'average': return 'Média';
    case 'class': return 'Turma';
    case 'date': return 'Data';
    default: return 'Nome';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: isSmallScreen ? 8 : 10,
    backgroundColor: '#f6f6f6',
  },
  loadingContainer: {
    flex: 1,
    padding: isSmallScreen ? 8 : 10,
    backgroundColor: '#f6f6f6',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  searchCard: {
    marginBottom: isSmallScreen ? 8 : 10,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  searchBar: {
    marginBottom: isSmallScreen ? 10 : 12,
    backgroundColor: '#f8f9fa',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  filterChips: {
    flexDirection: 'row',
    gap: isSmallScreen ? 6 : 8,
    paddingVertical: 4,
    flex: 1,
  },
  filterChip: {
    marginRight: isSmallScreen ? 6 : 8,
  },
  selectedFilterChip: {
    backgroundColor: '#2196f3',
  },
  sortButton: {
    margin: 0,
  },
  filterInfo: {
    fontSize: isSmallScreen ? 12 : 14,
    marginTop: isSmallScreen ? 6 : 8,
    color: '#666',
  },
  filterClassName: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  formCard: {
    marginBottom: isSmallScreen ? 16 : 20,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  listCard: {
    marginBottom: isSmallScreen ? 16 : 20,
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  listSubtitle: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
    marginTop: isSmallScreen ? 2 : 4,
  },
  studentCount: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#666',
    fontWeight: '600',
  },
  input: {
    marginBottom: isSmallScreen ? 12 : 16,
    backgroundColor: '#f8f9fa',
  },
  classSelection: {
    marginBottom: isSmallScreen ? 16 : 20,
  },
  classLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    marginBottom: isSmallScreen ? 6 : 8,
    color: '#000000',
  },
  classChips: {
    flexDirection: 'row',
    gap: isSmallScreen ? 6 : 8,
    paddingVertical: 4,
  },
  classChip: {
    marginRight: isSmallScreen ? 6 : 8,
  },
  selectedClassChip: {
    backgroundColor: '#2196f3',
  },
  selectedClassInfo: {
    fontSize: isSmallScreen ? 12 : 14,
    marginTop: isSmallScreen ? 6 : 8,
    color: '#666',
    fontStyle: 'italic',
  },
  selectedClassName: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  noClassesCard: {
    marginBottom: isSmallScreen ? 12 : 16,
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderRadius: 8,
  },
  noClassesText: {
    fontSize: isSmallScreen ? 14 : 16,
    textAlign: 'center',
    color: '#c62828',
    marginBottom: isSmallScreen ? 2 : 4,
  },
  noClassesSubtext: {
    fontSize: isSmallScreen ? 12 : 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: isSmallScreen ? 10 : 12,
  },
  createClassButton: {
    marginTop: isSmallScreen ? 2 : 4,
  },
  notesSection: {
    marginBottom: isSmallScreen ? 16 : 20,
  },
  notesTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 10 : 12,
    color: '#000000',
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 10 : 12,
  },
  noteInput: {
    flex: 1,
    marginRight: isSmallScreen ? 6 : 8,
    backgroundColor: '#f8f9fa',
  },
  deleteNoteButton: {
    margin: 0,
  },
  addNoteButton: {
    marginTop: isSmallScreen ? 6 : 8,
  },
  averagePreview: {
    marginTop: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 10 : 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  averagePreviewText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#1976d2',
  },
  averagePreviewNumber: {
    fontWeight: 'bold',
    fontSize: isSmallScreen ? 16 : 18,
  },
  saveButton: {
    marginTop: isSmallScreen ? 6 : 8,
    paddingVertical: isSmallScreen ? 4 : 6,
    borderRadius: 8,
  },
  cancelButton: {
    marginTop: isSmallScreen ? 6 : 8,
  },
  buttonContent: {
    height: isSmallScreen ? 44 : 48,
  },
  studentCard: {
    marginBottom: isSmallScreen ? 10 : 12,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  studentCardContent: {
    padding: isSmallScreen ? 12 : 16,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentInfo: {
    flex: 1,
    marginRight: isSmallScreen ? 6 : 8,
  },
  studentName: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 4 : 6,
    color: '#1976d2',
  },
  studentDetails: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  statusContainer: {
    marginBottom: isSmallScreen ? 6 : 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  studentNotes: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
    marginBottom: isSmallScreen ? 2 : 4,
    fontStyle: 'italic',
  },
  studentDate: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    margin: isSmallScreen ? -2 : -4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 30 : 40,
  },
  emptyIcon: {
    fontSize: isSmallScreen ? 40 : 48,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  emptyText: {
    fontSize: isSmallScreen ? 16 : 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: isSmallScreen ? 6 : 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: isSmallScreen ? 13 : 14,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
});

export default memo(StudentManager);