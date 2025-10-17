import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  RefreshControl
} from 'react-native';
import { TextInput, Button, Text, Card, Chip, IconButton } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { getClasses, saveClasses, getCurrentClass, saveCurrentClass, DataService } from '../utils/storage';

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
              icon="account-multiple"
            >
              {classItem.studentCount || 0} alunos
            </Chip>
            {isCurrent && (
              <Chip 
                mode="flat" 
                compact
                style={styles.currentClassChip}
                textStyle={{ color: 'white' }}
                icon="check-circle"
              >
                Turma Atual
              </Chip>
            )}
          </View>
          <Text style={styles.classDate}>
            📅 Criada em: {new Date(classItem.createdAt).toLocaleDateString('pt-BR')}
          </Text>
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
  const { getDisplayName } = useAuth();
  
  const [classes, setClasses] = useState([]);
  const [className, setClassName] = useState('');
  const [classSubject, setClassSubject] = useState('');
  const [editingClass, setEditingClass] = useState(null);
  const [currentClassId, setCurrentClassId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Callbacks memoizados
  const loadClasses = useCallback(async () => {
    try {
      const loadedClasses = await getClasses();
      setClasses(loadedClasses);
    } catch (error) {
      console.error('Erro ao carregar turmas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as turmas');
    }
  }, []);

  const loadCurrentClass = useCallback(async () => {
    try {
      const currentClass = await getCurrentClass();
      setCurrentClassId(currentClass || '');
    } catch (error) {
      console.error('Erro ao carregar turma atual:', error);
      setCurrentClassId('');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadClasses(), loadCurrentClass()]);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadClasses, loadCurrentClass]);

  const saveClass = useCallback(async () => {
    if (className.trim() === '') {
      Alert.alert('Erro', 'Por favor, insira o nome da turma');
      return;
    }

    if (classSubject.trim() === '') {
      Alert.alert('Erro', 'Por favor, insira a disciplina');
      return;
    }

    setSaving(true);

    try {
      const classData = {
        name: className.trim(),
        subject: classSubject.trim(),
        studentCount: 0
      };

      let result;
      if (editingClass) {
        result = await DataService.updateClass(editingClass.id, classData);
      } else {
        result = await DataService.saveClass(classData);
      }

      if (result.success) {
        // Recarregar a lista de turmas
        await loadClasses();
        
        // Limpar formulário
        setClassName('');
        setClassSubject('');
        setEditingClass(null);

        Alert.alert(
          '✅ Sucesso',
          editingClass ? 'Turma atualizada com sucesso!' : 'Turma criada com sucesso!'
        );
      } else {
        Alert.alert('❌ Erro', result.error || 'Não foi possível salvar a turma');
      }
    } catch (error) {
      console.error('Erro ao salvar turma:', error);
      Alert.alert('❌ Erro', 'Ocorreu um erro ao salvar a turma');
    } finally {
      setSaving(false);
    }
  }, [className, classSubject, editingClass, loadClasses]);

  const editClass = useCallback((classItem) => {
    setClassName(classItem.name);
    setClassSubject(classItem.subject);
    setEditingClass(classItem);
  }, []);

  const deleteClass = useCallback((classToDelete) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja excluir a turma "${classToDelete.name}"?\n\n⚠️  Todos os alunos desta turma serão removidos permanentemente.`,
      [
        { 
          text: 'Cancelar', 
          style: 'cancel'
        },
        {
          text: 'Excluir Turma',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DataService.deleteClass(classToDelete.id);
              
              if (result.success) {
                // Se a turma excluída era a atual, limpar a turma atual
                if (currentClassId === classToDelete.id) {
                  await saveCurrentClass('');
                  setCurrentClassId('');
                }
                
                await loadClasses();
                Alert.alert('✅ Sucesso', `Turma "${classToDelete.name}" excluída com sucesso!`);
              } else {
                Alert.alert('❌ Erro', result.error || 'Não foi possível excluir a turma');
              }
            } catch (error) {
              console.error('Erro ao excluir turma:', error);
              Alert.alert('❌ Erro', 'Ocorreu um erro ao excluir a turma');
            }
          },
        },
      ]
    );
  }, [currentClassId, loadClasses]);

  const setAsCurrentClass = useCallback(async (classItem) => {
    try {
      const result = await saveCurrentClass(classItem.id);
      
      if (result.success) {
        setCurrentClassId(classItem.id);
        Alert.alert('✅ Sucesso', `Turma "${classItem.name}" selecionada como atual!`);
      } else {
        Alert.alert('❌ Erro', 'Não foi possível selecionar a turma');
      }
    } catch (error) {
      console.error('Erro ao definir turma atual:', error);
      Alert.alert('❌ Erro', 'Ocorreu um erro ao selecionar a turma');
    }
  }, []);

  // Efeitos otimizados
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([loadClasses(), loadCurrentClass()]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Card style={styles.loadingCard}>
          <Card.Content>
            <Text style={styles.loadingText}>Carregando turmas...</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
        {/* Formulário de Turma */}
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              {editingClass ? '✏️ Editar Turma' : '🏫 Criar Nova Turma'}
            </Text>

            <TextInput
              label="Nome da Turma"
              value={className}
              onChangeText={setClassName}
              style={styles.input}
              mode="outlined"
              placeholder="Ex: 1º Ano A, Turma 101"
              disabled={saving}
            />

            <TextInput
              label="Disciplina"
              value={classSubject}
              onChangeText={setClassSubject}
              style={styles.input}
              mode="outlined"
              placeholder="Ex: Matemática, Português"
              disabled={saving}
            />

            <Button 
              mode="contained" 
              onPress={saveClass}
              style={styles.saveButton}
              disabled={!className.trim() || !classSubject.trim() || saving}
              loading={saving}
              contentStyle={styles.buttonContent}
            >
              {editingClass ? '💾 Atualizar Turma' : '✅ Criar Turma'}
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
                contentStyle={styles.buttonContent}
                disabled={saving}
              >
                ❌ Cancelar Edição
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Lista de Turmas */}
        <Card style={styles.listCard}>
          <Card.Content>
            <View style={styles.listHeader}>
              <Text style={styles.sectionTitle}>
                📚 Turmas Criadas ({classes.length})
              </Text>
              {currentClassId && (
                <Chip 
                  mode="outlined"
                  style={styles.currentClassIndicator}
                  textStyle={{ color: '#1976d2' }}
                  icon="check-circle"
                >
                  Turma Atual
                </Chip>
              )}
            </View>

            {classes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏫</Text>
                <Text style={styles.emptyText}>
                  Nenhuma turma criada ainda
                </Text>
                <Text style={styles.emptySubtext}>
                  Crie sua primeira turma usando o formulário acima
                </Text>
              </View>
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

        {/* Informações */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text style={styles.infoTitle}>💡 Dicas</Text>
            <Text style={styles.infoText}>
              • Selecione uma turma como "Turma Atual" para acesso rápido
            </Text>
            <Text style={styles.infoText}>
              • Cada turma pode ter múltiplos alunos
            </Text>
            <Text style={styles.infoText}>
              • As disciplinas ajudam a organizar suas turmas
            </Text>
            <Text style={styles.infoText}>
              • Use o ícone ✅ para definir a turma atual
            </Text>
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
    padding: 10,
    paddingBottom: 20,
  },
  formCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  listCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  infoCard: {
    marginBottom: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  currentClassIndicator: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#ffffff',
  },
  saveButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  cancelButton: {
    marginTop: 10,
  },
  buttonContent: {
    height: 48,
  },
  classCard: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 1,
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
    marginBottom: 8,
  },
  studentCountChip: {
    height: 28,
  },
  currentClassChip: {
    height: 28,
    backgroundColor: '#2196f3',
  },
  classDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  classActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionButton: {
    margin: -2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 6,
    lineHeight: 20,
  },
});

export default memo(ClassManager);