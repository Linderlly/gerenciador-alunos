import React, { useState, useEffect, useCallback, memo } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Switch, List, Button, Text, Divider } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { getTheme, saveTheme, StorageService, clearAllData, createBackup, getBackupInfo } from '../utils/storage';

// Componentes memoizados
const ThemeOption = memo(({ title, description, icon, isSelected, onPress }) => (
  <List.Item
    title={title}
    description={description}
    left={props => <List.Icon {...props} icon={icon} />}
    right={props => <Switch value={isSelected} onValueChange={onPress} color="#6200ee" />}
    onPress={onPress}
    style={styles.listItem}
  />
));

const ActionButton = memo(({ onPress, icon, children, mode = 'outlined', color, disabled = false }) => (
  <Button 
    mode={mode} 
    onPress={onPress} 
    icon={icon} 
    buttonColor={color} 
    style={styles.actionButton}
    disabled={disabled}
  >
    {children}
  </Button>
));

function SettingsScreen({ navigation }) {
  const { user, teacherData, logout, getDisplayName } = useAuth();
  const [themeMode, setThemeMode] = useState('light');
  const [backupInfo, setBackupInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar configurações
  const loadSettings = useCallback(async () => {
    try {
      const [themeResult, backupData] = await Promise.all([
        getTheme(),
        getBackupInfo()
      ]);
      
      if (themeResult.success) {
        setThemeMode(themeResult.theme);
      }
      
      setBackupInfo(backupData);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  }, []);

  // Alterar tema
  const handleThemeChange = useCallback(async (newTheme) => {
    try {
      setIsLoading(true);
      setThemeMode(newTheme);
      const result = await saveTheme(newTheme);
      
      if (result.success) {
        Alert.alert('✅ Sucesso', 'Tema alterado com sucesso!');
      } else {
        Alert.alert('❌ Erro', 'Não foi possível salvar o tema');
        // Reverter se houve erro
        const currentTheme = await getTheme();
        setThemeMode(currentTheme.theme);
      }
    } catch (error) {
      Alert.alert('❌ Erro', 'Ocorreu um erro ao alterar o tema');
      console.error('Erro ao alterar tema:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const handleLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja sair da conta atual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            Alert.alert('❌ Erro', 'Não foi possível sair da conta');
          }
        },
      },
    ]);
  }, [logout]);

  // Limpar todos os dados
  const handleClearData = useCallback(() => {
    Alert.alert(
      '⚠️ Limpar Todos os Dados',
      'Tem certeza que deseja apagar TODOS os dados (alunos, turmas, eventos)?\n\n⚠️  Esta ação não pode ser desfeita!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await clearAllData();
              
              if (result.success) {
                Alert.alert('✅ Sucesso', 'Todos os dados foram limpos!');
              } else {
                Alert.alert('❌ Erro', result.error || 'Não foi possível limpar os dados');
              }
            } catch (error) {
              Alert.alert('❌ Erro', 'Ocorreu um erro ao limpar os dados');
              console.error('Erro ao limpar dados:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, []);

  // Criar backup
  const handleCreateBackup = useCallback(async () => {
    try {
      setIsLoading(true);
      const backupData = await createBackup();
      
      if (backupData.success) {
        const info = await getBackupInfo();
        setBackupInfo(info);
        
        Alert.alert(
          '✅ Backup Criado',
          `Backup realizado com sucesso!\n\n📅 Data: ${new Date(backupData.backup.backupDate).toLocaleDateString('pt-BR')}\n👨‍🏫 Professor: ${getDisplayName()}\n👥 Alunos: ${backupData.backup.students?.length || 0}\n🏫 Turmas: ${backupData.backup.classes?.length || 0}\n📅 Eventos: ${backupData.backup.events?.length || 0}`
        );
      } else {
        Alert.alert('❌ Erro', backupData.error || 'Não foi possível criar o backup');
      }
    } catch (error) {
      Alert.alert('❌ Erro', 'Ocorreu um erro ao criar o backup');
      console.error('Erro ao criar backup:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getDisplayName]);

  // Restaurar backup
  const handleRestoreBackup = useCallback(async () => {
    if (!backupInfo) {
      Alert.alert('ℹ️ Sem Backup', 'Nenhum backup encontrado para restaurar.');
      return;
    }

    Alert.alert(
      '🔄 Restaurar Backup',
      `Deseja restaurar o backup de ${new Date(backupInfo.date).toLocaleDateString('pt-BR')}?\n\n📊 Estatísticas do Backup:\n👨‍🏫 Professor: ${getDisplayName()}\n👥 Alunos: ${backupInfo.studentCount}\n🏫 Turmas: ${backupInfo.classCount}\n📅 Eventos: ${backupInfo.eventCount || 0}\n\n⚠️ Os dados atuais serão substituídos!`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              // Em uma implementação real, aqui você restauraria do backup
              // Por enquanto, apenas sincronizamos os dados
              const syncResult = await StorageService.syncAllData();
              
              if (syncResult.success) {
                Alert.alert(
                  '✅ Sincronização Concluída',
                  'Dados sincronizados com sucesso!',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('❌ Erro', 'Não foi possível sincronizar os dados');
              }
            } catch (error) {
              Alert.alert('❌ Erro', 'Ocorreu um erro ao restaurar o backup');
              console.error('Erro ao restaurar backup:', error);
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }, [backupInfo, getDisplayName]);

  // Informações do backup
  const handleBackupInfo = useCallback(async () => {
    const info = await getBackupInfo();
    if (info) {
      Alert.alert(
        '📊 Informações do Backup',
        `📅 Data do Backup: ${new Date(info.date).toLocaleDateString('pt-BR')}\n⏰ Hora: ${new Date(info.date).toLocaleTimeString('pt-BR')}\n\n📊 Estatísticas:\n👨‍🏫 Professor: ${getDisplayName()}\n👥 Alunos: ${info.studentCount}\n🏫 Turmas: ${info.classCount}\n📅 Eventos: ${info.eventCount || 0}`
      );
    } else {
      Alert.alert('ℹ️ Sem Backup', 'Nenhum backup encontrado. Crie um backup primeiro.');
    }
  }, [getDisplayName]);

  // Sincronizar dados
  const handleSyncData = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await StorageService.syncAllData();
      
      if (result.success) {
        Alert.alert('✅ Sincronização Concluída', 'Todos os dados foram sincronizados com sucesso!');
        // Atualizar informações do backup
        const info = await getBackupInfo();
        setBackupInfo(info);
      } else {
        Alert.alert('⚠️ Sincronização com Avisos', `Alguns dados podem não ter sido sincronizados: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('❌ Erro', 'Ocorreu um erro na sincronização');
      console.error('Erro na sincronização:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efeitos
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSettings();
    });

    return unsubscribe;
  }, [navigation, loadSettings]);

  return (
    <ScrollView style={styles.container}>
      {/* Informações do Usuário */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>👤 Informações do Usuário</Text>
          <List.Item
            title="Professor"
            description={getDisplayName()}
            left={props => <List.Icon {...props} icon="account" />}
            style={styles.listItem}
          />
          <List.Item
            title="Email"
            description={user?.email || 'Não disponível'}
            left={props => <List.Icon {...props} icon="email" />}
            style={styles.listItem}
          />
          <List.Item
            title="ID do Usuário"
            description={user?.uid ? `${user.uid.substring(0, 8)}...` : 'Não disponível'}
            left={props => <List.Icon {...props} icon="identifier" />}
            style={styles.listItem}
          />
        </Card.Content>
      </Card>

      {/* Aparência */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>🎨 Aparência</Text>

          <ThemeOption
            title="Tema Claro"
            description="Usar cores claras"
            icon="white-balance-sunny"
            isSelected={themeMode === 'light'}
            onPress={() => handleThemeChange('light')}
          />
          
          <ThemeOption
            title="Tema Escuro"
            description="Usar cores escuras"
            icon="weather-night"
            isSelected={themeMode === 'dark'}
            onPress={() => handleThemeChange('dark')}
          />
          
          <ThemeOption
            title="Automático"
            description="Seguir configuração do sistema"
            icon="theme-light-dark"
            isSelected={themeMode === 'auto'}
            onPress={() => handleThemeChange('auto')}
          />
        </Card.Content>
      </Card>

      {/* Sincronização */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>🔄 Sincronização</Text>
          
          <ActionButton 
            onPress={handleSyncData} 
            icon="sync" 
            mode="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Sincronizando...' : 'Sincronizar Dados'}
          </ActionButton>
          
          <Text style={styles.featureDescription}>
            Sincronize seus dados com a nuvem para acessá-los de qualquer dispositivo.
          </Text>

          {backupInfo && (
            <Text style={styles.syncInfo}>
              📅 Última sincronização: {new Date(backupInfo.date).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Assistente Inteligente */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>🤖 Assistente Inteligente</Text>
          
          <ActionButton 
            onPress={() => navigation.navigate('AIAssistant')} 
            icon="robot" 
            mode="contained"
          >
            Abrir Assistente IA
          </ActionButton>
          
          <Text style={styles.featureDescription}>
            Analise o desempenho dos alunos com nossa IA e receba insights inteligentes sobre progresso, dificuldades e recomendações.
          </Text>
        </Card.Content>
      </Card>

      {/* Visualizações */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>📊 Visualizações</Text>
          
          <ActionButton 
            onPress={() => navigation.navigate('ChartsScreen')} 
            icon="chart-bar" 
            mode="outlined"
          >
            Gráficos de Desempenho
          </ActionButton>
          
          <ActionButton 
            onPress={() => navigation.navigate('CalendarScreen')} 
            icon="calendar" 
            mode="outlined"
          >
            Calendário de Eventos
          </ActionButton>
        </Card.Content>
      </Card>

      {/* Backup e Restauração */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>💾 Backup e Restauração</Text>
          
          <ActionButton 
            onPress={handleCreateBackup} 
            icon="content-save" 
            mode="contained"
            disabled={isLoading}
          >
            Criar Backup
          </ActionButton>
          
          <ActionButton 
            onPress={handleRestoreBackup} 
            icon="backup-restore" 
            mode="outlined"
            disabled={isLoading || !backupInfo}
          >
            Restaurar Backup
          </ActionButton>
          
          <ActionButton 
            onPress={handleBackupInfo} 
            icon="information" 
            mode="outlined"
          >
            Informações do Backup
          </ActionButton>

          {backupInfo && (
            <Text style={styles.backupInfo}>
              📅 Último backup: {new Date(backupInfo.date).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Navegação Rápida */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>⚡ Navegação Rápida</Text>
          
          <ActionButton 
            onPress={() => navigation.navigate('ClassManager')} 
            icon="account-multiple"
          >
            Gerenciar Turmas
          </ActionButton>
          
          <ActionButton 
            onPress={() => navigation.navigate('StudentManager')} 
            icon="account-plus"
          >
            Gerenciar Alunos
          </ActionButton>

          <ActionButton 
            onPress={() => navigation.navigate('StudentAverages')} 
            icon="chart-box"
          >
            Ver Médias
          </ActionButton>
        </Card.Content>
      </Card>

      {/* Área Perigosa */}
      <Card style={[styles.card, styles.dangerCard]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>⚠️ Área Perigosa</Text>
          <Text style={styles.dangerText}>
            Estas ações não podem ser desfeitas. Tenha certeza antes de prosseguir.
          </Text>
          
          <ActionButton 
            onPress={handleClearData} 
            icon="delete-forever" 
            mode="contained" 
            color="#d32f2f"
            disabled={isLoading}
          >
            {isLoading ? 'Limpando...' : 'Limpar Todos os Dados'}
          </ActionButton>

          <Divider style={styles.divider} />
          
          <ActionButton 
            onPress={handleLogout} 
            icon="logout"
            mode="outlined"
            color="#d32f2f"
          >
            Sair da Conta
          </ActionButton>
        </Card.Content>
      </Card>

      {/* Sobre o App */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>ℹ️ Sobre o App</Text>
          <Text style={styles.versionText}>
            🚀 Sistema gerenciador de alunos v1.0.0
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 10,
    backgroundColor: '#f6f6f6',
  },
  card: { 
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    elevation: 2,
  },
  dangerCard: { 
    borderColor: '#d32f2f',
    borderWidth: 1,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 16,
    color: '#000000',
  },
  dangerTitle: { 
    color: '#d32f2f' 
  },
  listItem: { 
    paddingVertical: 8 
  },
  actionButton: { 
    marginVertical: 4 
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  dangerText: { 
    fontSize: 14, 
    marginBottom: 12, 
    fontStyle: 'italic', 
    color: '#666',
    lineHeight: 20,
  },
  versionText: { 
    fontSize: 16, 
    marginBottom: 12,
    fontWeight: '600',
    color: '#000000',
  },
  featureItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    marginLeft: 8,
  },
  backupInfo: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  syncInfo: {
    fontSize: 12,
    color: '#4caf50',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 12,
  },
});

export default memo(SettingsScreen);