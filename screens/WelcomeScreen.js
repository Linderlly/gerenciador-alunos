import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, StyleSheet, Alert, Text, Dimensions, RefreshControl } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentClassWithDetails, preloadData, StorageService } from '../utils/storage';

const { width, height } = Dimensions.get('window');

// Componentes memoizados para melhor performance
const ClassCard = memo(({ currentClass, navigation }) => {
  if (!currentClass) {
    return (
      <Card style={styles.noClassCard} mode="outlined">
        <Card.Content>
          <Text style={styles.noClassText}>
            🏫 Nenhuma turma selecionada
          </Text>
          <Text style={styles.noClassSubtext}>
            Selecione uma turma para começar a gerenciar os alunos
          </Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.navigate('ClassManager')}
            style={styles.selectClassButton}
            icon="account-multiple-plus"
            contentStyle={styles.buttonContent}
          >
            Selecionar Turma
          </Button>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.classCard} mode="outlined">
      <Card.Content>
        <View style={styles.classHeader}>
          <View style={styles.classInfo}>
            <Text style={styles.classLabel}>
              🎯 TURMA ATUAL
            </Text>
            <Text style={styles.className}>
              {currentClass.name}
            </Text>
            <Text style={styles.classSubject}>
              📖 {currentClass.subject}
            </Text>
          </View>
          <View style={styles.classStats}>
            <Text style={styles.studentCount}>
              {currentClass.studentCount || 0}
            </Text>
            <Text style={styles.studentLabel}>
              alunos
            </Text>
          </View>
        </View>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('ClassManager')}
          style={styles.changeClassButton}
          icon="swap-horizontal"
          contentStyle={styles.buttonContent}
        >
          Trocar Turma
        </Button>
      </Card.Content>
    </Card>
  );
});

const MenuButton = memo(({ onPress, icon, children }) => (
  <Button 
    mode="contained" 
    onPress={onPress}
    style={styles.menuButton}
    icon={icon}
    contentStyle={styles.buttonContent}
  >
    {children}
  </Button>
));

const SkeletonLoader = memo(() => (
  <Card style={styles.mainCard}>
    <Card.Content>
      <View style={[styles.skeleton, { width: '60%', height: 32, marginBottom: 16 }]} />
      <View style={[styles.skeleton, { width: '40%', height: 20, marginBottom: 32 }]} />
      
      <Card style={styles.classCard}>
        <Card.Content>
          <View style={styles.classHeader}>
            <View style={styles.classInfo}>
              <View style={[styles.skeleton, { width: '30%', height: 14, marginBottom: 8 }]} />
              <View style={[styles.skeleton, { width: '70%', height: 22, marginBottom: 4 }]} />
              <View style={[styles.skeleton, { width: '50%', height: 18, marginBottom: 8 }]} />
            </View>
            <View style={styles.classStats}>
              <View style={[styles.skeleton, { width: 40, height: 32, marginBottom: 4 }]} />
              <View style={[styles.skeleton, { width: 30, height: 14 }]} />
            </View>
          </View>
        </Card.Content>
      </Card>

      {[1, 2, 3, 4, 5, 6, 7].map((item) => (
        <View key={item} style={[styles.skeleton, { height: 52, marginVertical: 6 }]} />
      ))}
    </Card.Content>
  </Card>
));

function WelcomeScreen({ navigation, route }) {
  const { user, teacherData, logout, getDisplayName } = useAuth();
  const [currentClass, setCurrentClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  // Carregar dados iniciais
  const loadData = useCallback(async () => {
    try {
      await Promise.all([loadCurrentClass(), preloadData()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carregar turma atual
  const loadCurrentClass = useCallback(async () => {
    try {
      const currentClassData = await getCurrentClassWithDetails();
      setCurrentClass(currentClassData);
    } catch (error) {
      console.error('Erro ao carregar turma atual:', error);
      setCurrentClass(null);
    }
  }, []);

  // Atualizar dados
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await StorageService.syncAllData();
      await loadCurrentClass();
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadCurrentClass]);

  // Mostrar mensagem de boas-vindas se veio do login
  const hideWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);

  // Logout
  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sair da Conta',
      'Deseja sair da conta atual?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível sair');
            }
          },
        },
      ]
    );
  }, [logout]);

  // Efeitos
  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurrentClass();
    });

    return unsubscribe;
  }, [navigation, loadCurrentClass]);

  useEffect(() => {
    // Mostrar boas-vindas se acabou de fazer login
    if (route.params?.fromLogin) {
      setShowWelcome(true);
    }
  }, [route.params]);

  // Pré-carregar dados para telas futuras
  useEffect(() => {
    const preloadAppData = async () => {
      await preloadData();
    };
    preloadAppData();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonLoader />
      </View>
    );
  }

  return (
    <View 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#1976d2']}
          tintColor="#1976d2"
        />
      }
    >
      <Card style={styles.mainCard}>
        <Card.Content>
          <Text style={styles.mainTitle}>
            📚 Sistema de Médias
          </Text>
          <Text style={styles.mainSubtitle}>
            Olá, {getDisplayName()}
          </Text>

          <ClassCard currentClass={currentClass} navigation={navigation} />

          <MenuButton 
            onPress={() => navigation.navigate('ClassManager')}
            icon="account-multiple"
          >
            Gerenciar Turmas
          </MenuButton>

          <MenuButton 
            onPress={() => navigation.navigate('StudentManager')}
            icon="account-plus"
          >
            Gerenciar Alunos
          </MenuButton>
          
          <MenuButton 
            onPress={() => navigation.navigate('StudentAverages')}
            icon="chart-box"
          >
            Ver Médias
          </MenuButton>
          
          <MenuButton 
            onPress={() => navigation.navigate('ChartsScreen')}
            icon="chart-bar"
          >
            Gráficos de Desempenho
          </MenuButton>

          <MenuButton 
            onPress={() => navigation.navigate('CalendarScreen')}
            icon="calendar"
          >
            Calendário
          </MenuButton>

          <MenuButton 
            onPress={() => navigation.navigate('AIAssistant')}
            icon="robot"
          >
            Assistente IA
          </MenuButton>

          <MenuButton 
            onPress={() => navigation.navigate('SettingsScreen')}
            icon="cog"
          >
            Configurações
          </MenuButton>

          <View style={styles.footerButtons}>
            <Button 
              mode="text" 
              onPress={handleLogout}
              style={styles.footerButton}
              textColor="#666"
              icon="logout"
              contentStyle={styles.footerButtonContent}
            >
              Sair
            </Button>
          </View>
        </Card.Content>
      </Card>

      {showWelcome && (
        <View style={styles.popupOverlay}>
          <Card style={styles.popupCard}>
            <Card.Content style={styles.popupContent}>
              <Text style={styles.welcomeText}>
                🎉 Bem-vindo, {getDisplayName()}!
              </Text>
              <Text style={styles.popupSubtitle}>
                Pronto para gerenciar as médias dos seus alunos?
              </Text>
              <Button 
                mode="contained" 
                onPress={hideWelcome}
                style={styles.popupButton}
                contentStyle={styles.popupButtonContent}
              >
                Vamos lá!
              </Button>
            </Card.Content>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f6f6f6',
  },
  loadingContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f6f6f6',
  },
  skeleton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popupCard: {
    width: width * 0.8,
    maxWidth: 340,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    margin: 20,
  },
  popupContent: {
    alignItems: 'center',
    padding: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#1976d2',
  },
  popupSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  popupButton: {
    marginTop: 10,
    width: '100%',
    borderRadius: 8,
  },
  popupButtonContent: {
    height: 48,
  },
  mainCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000000',
  },
  mainSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  classCard: {
    marginBottom: 20,
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderRadius: 12,
  },
  noClassCard: {
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    borderColor: '#bdbdbd',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  classInfo: {
    flex: 1,
  },
  classStats: {
    alignItems: 'center',
    marginLeft: 10,
  },
  classLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  classSubject: {
    fontSize: 16,
    color: '#1976d2',
    marginBottom: 6,
  },
  studentCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  studentLabel: {
    fontSize: 12,
    color: '#666',
  },
  changeClassButton: {
    marginTop: 6,
  },
  noClassText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 6,
  },
  noClassSubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 16,
    lineHeight: 20,
  },
  selectClassButton: {
    marginTop: 6,
  },
  menuButton: {
    marginVertical: 6,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
    justifyContent: 'flex-start',
  },
  footerButtons: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerButton: {
    flex: 1,
  },
  footerButtonContent: {
    height: 44,
  },
});

export default memo(WelcomeScreen);