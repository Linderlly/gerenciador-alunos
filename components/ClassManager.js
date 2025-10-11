import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList
} from 'react-native';
import { TextInput, Button, Text, Card, Chip, IconButton } from 'react-native-paper';
import { getClasses, saveClasses, getCurrentClass, saveCurrentClass, getStudents, updateAllClassStudentCounts, saveStudents } from '../utils/storage';

// Componentes memoizados
const ClassCard = memo(({ classItem, isCurrent, onSetCurrent, onEdit, onDelete }) => (
  <Card 
    style={[
      styles.classCard,
      isCurrent && styles.currentClassCard
    ]}
  >
    <Card.Content>
      <View style={styles.classHeader}>
        <View style={styles.classInfo}>
          <Text style={styles.className}>
            {classItem.name}
          </Text>
          <Text style={styles.classSubject}>
            {classItem.subject}
          </Text>
          <View style={styles.classDetails}>
            <Chip 
              mode="outlined" 
              compact
              style={styles.studentCountChip}
            >
              {classItem.studentCount || 0} alunos
            </Chip>
            {isCurrent && (
              <Chip 
                mode="flat" 
                compact
                style={styles.currentClassChip}
                textStyle={{ color: 'white' }}
              >
                Atual
              </Chip>
            )}
          </View>
        </View>
        
        <View style={styles.classActions}>
          {!isCurrent && (
            <IconButton
              icon="check-circle"
              size={20}
              iconColor="#4caf50"
              onPress={() => onSetCurrent(classItem)}
              style={styles.actionButton}
            />
          )}
          <IconButton
            icon="pencil"
            size={20}
            iconColor="#2196f3"
            onPress={() => onEdit(classItem)}
            style={styles.actionButton}
          />
          <IconButton
            icon="delete"
            size={20}
            iconColor="#f44336"
            onPress={() => onDelete(classItem)}
            style={styles.actionButton}
          />
        </View>
      </View>
    </Card.Content>
  </Card>
));

function ClassManager({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [editingClass, setEditingClass] = useState(null);
  const [currentClassId, setCurrentClassId] = useState('');

  // Callbacks memoizados
  const loadClasses = useCallback(async () => {
    try {
      const loadedClasses = await getClasses();
      await updateAllClassStudentCounts();
      const updatedClasses = await getClasses();
      setClasses(updatedClasses);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as turmas');
    }
  }, []);

  const loadCurrentClass = useCallback(async () => {
    try {
      const currentClass = await getCurrentClass();
      setCurrentClassId(currentClass || '');
    } catch (error) {
      setCurrentClassId('');
    }
  }, []);

  const saveClass = useCallback(async () => {
    if (className.trim() === '') {
      Alert.alert('Erro', 'Por favor, insira o nome da turma');
      return;
    }

    if (classSubject.trim() === '') {
      Alert.alert('Erro', 'Por favor, insira a disciplina');
      return;
    }

    const newClass = {
      id: editingClass ? editingClass.id : Date.now().toString(),
      name: className.trim(),
      subject: classSubject.trim(),
      studentCount: 0,
      createdAt: editingClass ? editingClass.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updatedClasses;
    if (editingClass) {
      updatedClasses = classes.map(cls =>
        cls.id === editingClass.id ? newClass : cls
      );
    } else {
      updatedClasses = [...classes, newClass];
    }

    try {
      setClasses(updatedClasses);
      const saved = await saveClasses(updatedClasses);
      
      if (saved) {
        await updateAllClassStudentCounts();
        const finalClasses = await getClasses();
        setClasses(finalClasses);
        
        setClassName('');
        setClassSubject('');
        setEditingClass(null);

        Alert.alert(
          'Sucesso',
          editingClass ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!'
        );
      } else {
        Alert.alert('Erro', 'Não foi possível salvar a turma');
        loadClasses();
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar a turma');
      loadClasses();
    }
  }, [className, classSubject, editingClass, classes, loadClasses]);

  const editClass = useCallback((classItem) => {
    setClassName(classItem.name);
    setClassSubject(classItem.subject);
    setEditingClass(classItem);
  }, []);

  const deleteClass = useCallback((classToDelete) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir a turma "${classToDelete.name}"? Todos os alunos desta turma serão removidos.`,
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
              const students = await getStudents();
              const updatedStudents = students.filter(student => 
                student.classId !== classToDelete.id
              );
              await saveStudents(updatedStudents);

              const updatedClasses = classes.filter(cls => 
                cls.id !== classToDelete.id
              );

              setClasses(updatedClasses);
              const saved = await saveClasses(updatedClasses);
              
              if (saved) {
                if (currentClassId === classToDelete.id) {
                  await saveCurrentClass('');
                  setCurrentClassId('');
                }
                
                await updateAllClassStudentCounts();
                const finalClasses = await getClasses();
                setClasses(finalClasses);
                
                Alert.alert('Sucesso', `Turma "${classToDelete.name}" excluída com sucesso!`);
              } else {
                Alert.alert('Erro', 'Não foi possível excluir a turma');
                loadClasses();
              }
            } catch (error) {
              Alert.alert('Erro', 'Ocorreu um erro ao excluir a turma');
              loadClasses();
            }
          },
        },
      ]
    );
  }, [classes, currentClassId, loadClasses]);

  const setAsCurrentClass = useCallback(async (classItem) => {
    try {
      await saveCurrentClass(classItem.id);
      setCurrentClassId(classItem.id);
      
      const updatedClasses = await getClasses();
      setClasses(updatedClasses);
      
      Alert.alert('Sucesso', `Turma "${classItem.name}" selecionada como atual!`);
      navigation.navigate('WelcomeScreen');
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a turma');
    }
  }, [navigation]);

  // Efeitos otimizados
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadClasses(), loadCurrentClass()]);
    };
    loadData();
  }, [loadClasses, loadCurrentClass]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadClasses();
      loadCurrentClass();
    });

    return unsubscribe;
  }, [navigation, loadClasses, loadCurrentClass]);

  // Renderização otimizada com FlatList
  const renderClassItem = useCallback(({ item }) => (
    <ClassCard
      classItem={item}
      isCurrent={currentClassId === item.id}
      onSetCurrent={setAsCurrentClass}
      onEdit={editClass}
      onDelete={deleteClass}
    />
  ), [currentClassId, setAsCurrentClass, editClass, deleteClass]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              {editingClass ? 'Editar Turma' : 'Criar Nova Turma'}
            </Text>

            <TextInput
              label="Nome da Turma"
              value={className}
              onChangeText={setClassName}
              style={styles.input}
              mode="outlined"
              placeholder="Ex: 1º Ano A, Turma 101"
            />

            <TextInput
              label="Disciplina"
              value={classSubject}
              onChangeText={setClassSubject}
              style={styles.input}
              mode="outlined"
              placeholder="Ex: Matemática, Português"
            />

            <Button 
              mode="contained" 
              onPress={saveClass}
              style={styles.saveButton}
              disabled={!className.trim() || !classSubject.trim()}
            >
              {editingClass ? 'Atualizar Turma' : 'Criar Turma'}
            </Button>

            {editingClass && (
              <Button 
                mode="outlined" 
                onPress={() => {
                  setClassName('');
                  setClassSubject('');
                  setEditingClass(null);
                }}
                style={styles.cancelButton}
              >
                Cancelar Edição
              </Button>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.listCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              Turmas Criadas ({classes.length})
            </Text>

            {classes.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhuma turma criada ainda. Crie sua primeira turma!
              </Text>
            ) : (
              <FlatList
                data={classes}
                keyExtractor={keyExtractor}
                renderItem={renderClassItem}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  scrollContent: {
    padding: 10,
    paddingBottom: 40, 
  },
  formCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  listCard: {
    marginBottom: 30,
    backgroundColor: '#ffffff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#ffffff',
  },
  saveButton: {
    marginTop: 10,
    padding: 5,
  },
  cancelButton: {
    marginTop: 10,
  },
  classCard: {
    marginBottom: 15, 
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  currentClassCard: {
    borderColor: '#2196f3',
    backgroundColor: '#e3f2fd',
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  classInfo: {
    flex: 1,
    marginRight: 10,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000000',
  },
  classSubject: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  classDetails: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap', 
    marginTop: 5, 
  },
  studentCountChip: {
    height: 28, 
    marginBottom: 2, 
  },
  currentClassChip: {
    height: 28, 
    backgroundColor: '#2196f3',
    marginBottom: 2, 
  },
  classActions: {
    flexDirection: 'row',
    alignItems: 'flex-start', 
    marginTop: -5, 
  },
  actionButton: {
    margin: -2, 
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 30, 
    paddingVertical: 20, 
  },
});

export default memo(ClassManager);