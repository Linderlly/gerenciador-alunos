import React, { useState, useEffect, useCallback, memo } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Switch, List, Button, Text } from 'react-native-paper';
import { getTheme, saveTheme, getTeacherName, clearTeacherData, clearAllData, createBackup, restoreBackup, getBackupInfo } from '../utils/storage';

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

const ActionButton = memo(({ onPress, icon, children, mode = 'outlined', color }) => (
  <Button mode={mode} onPress={onPress} icon={icon} buttonColor={color} style={styles.actionButton}>
    {children}
  </Button>
));

function SettingsScreen({ navigation, themeMode, setThemeMode }) {
  const [teacherName, setTeacherName] = useState('');
  const [backupInfo, setBackupInfo] = useState(null);

  const loadSettings = useCallback(async () => {
    try {
      const [name, backupData] = await Promise.all([
        getTeacherName(),
        getBackupInfo()
      ]);
      setTeacherName(name || '');
      setBackupInfo(backupData);
    } catch (error) {
      setTeacherName('');
      setBackupInfo(null);
    }
  }, []);

  const handleThemeChange = useCallback(async (newTheme) => {
    try {
      setThemeMode(newTheme);
      await saveTheme(newTheme);
      Alert.alert('Sucesso', 'Tema alterado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o tema');
    }
  }, [setThemeMode]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja sair da conta atual?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearTeacherData();
            navigation.reset({ index: 0, routes: [{ name: 'TeacherLogin' }] });
          } catch (error) {
            Alert.alert('Erro', 'Não foi possível sair da conta');
          }
        },
      },
    ]);
  }, [navigation]);

  const handleClearData = useCallback(() => {
    Alert.alert(
      '⚠️ Limpar Todos os Dados',
      'Tem certeza que deseja apagar TODOS os dados (alunos, turmas, etc.)?\n\nEsta ação não pode ser desfeita!',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar Tudo',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert('✅ Sucesso', 'Todos os dados foram limpos!');
              navigation.reset({ index: 0, routes: [{ name: 'TeacherLogin' }] });
            } catch (error) {
              Alert.alert('❌ Erro', 'Não foi possível limpar os dados');
            }
          },
        },
      ]
    );
  }, [navigation]);

  const handleCreateBackup = useCallback(async () => {
    try {
      const backupData = await createBackup();
      if (backupData) {
        const info = await getBackupInfo();
        setBackupInfo(info);
        Alert.alert(
          '✅ Backup Criado',
          `Backup realizado com sucesso!\n\n📅 Data: ${new Date(backupData.backupDate).toLocaleDateString('pt-BR')}\n👨‍🏫 Professor: ${backupData.teacherName || 'N/A'}\n👥 Alunos: ${backupData.students?.length || 0}\n🏫 Turmas: ${backupData.classes?.length || 0}\n📅 Eventos: ${backupData.events?.length || 0}\n🤖 Insights: ${backupData.insights?.length || 0}`
        );
      } else {
        Alert.alert('❌ Erro', 'Não foi possível criar o backup');
      }
    } catch (error) {
      Alert.alert('❌ Erro', 'Ocorreu um erro ao criar o backup');
    }
  }, []);

  const handleRestoreBackup = useCallback(async () => {
    const backupInfo = await getBackupInfo();
    if (!backupInfo) {
      Alert.alert('ℹ️ Sem Backup', 'Nenhum backup encontrado para restaurar.');
      return;
    }

    Alert.alert(
      '🔄 Restaurar Backup',
      `Deseja restaurar o backup de ${new Date(backupInfo.date).toLocaleDateString('pt-BR')}?\n\n📊 Estatísticas do Backup:\n👨‍🏫 Professor: ${backupInfo.teacherName || 'N/A'}\n👥 Alunos: ${backupInfo.studentCount}\n🏫 Turmas: ${backupInfo.classCount}\n📅 Eventos: ${backupInfo.eventCount || 0}\n🤖 Insights: ${backupInfo.insightCount || 0}\n\n⚠️ Os dados atuais serão substituídos!`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await restoreBackup();
              if (success) {
                Alert.alert(
                  '✅ Backup Restaurado',
                  'Backup restaurado com sucesso! O aplicativo será reiniciado.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        navigation.reset({
                          index: 0,
                          routes: [{ name: 'WelcomeScreen' }],
                        });
                      },
                    },
                  ]
                );
              } else {
                Alert.alert('❌ Erro', 'Não foi possível restaurar o backup');
              }
            } catch (error) {
              Alert.alert('❌ Erro', 'Ocorreu um erro ao restaurar o backup');
            }
          },
        },
      ]
    );
  }, [navigation]);

  const handleBackupInfo = useCallback(async () => {
    const info = await getBackupInfo();
    if (info) {
      Alert.alert(
        '📊 Informações do Backup',
        `📅 Data do Backup: ${new Date(info.date).toLocaleDateString('pt-BR')}\n⏰ Hora: ${new Date(info.date).toLocaleTimeString('pt-BR')}\n\n📊 Estatísticas:\n👨‍🏫 Professor: ${info.teacherName || 'N/A'}\n👥 Alunos: ${info.studentCount}\n🏫 Turmas: ${info.classCount}\n📅 Eventos: ${info.eventCount || 0}\n🤖 Insights: ${info.insightCount || 0}`
      );
    } else {
      Alert.alert('ℹ️ Sem Backup', 'Nenhum backup encontrado. Crie um backup primeiro.');
    }
  }, []);

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
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>👤 Informações do Usuário</Text>
          <List.Item
            title="Professor"
            description={teacherName || 'Não definido'}
            left={props => <List.Icon {...props} icon="account" />}
            style={styles.listItem}
          />
        </Card.Content>
      </Card>

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
            Analise o desempenho dos alunos com nossa IA local e receba insights inteligentes sobre progresso, dificuldades e recomendações.
          </Text>
        </Card.Content>
      </Card>

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

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>💾 Backup e Restauração</Text>
          
          <ActionButton 
            onPress={handleCreateBackup} 
            icon="content-save" 
            mode="contained"
          >
            Criar Backup
          </ActionButton>
          
          <ActionButton 
            onPress={handleRestoreBackup} 
            icon="backup-restore" 
            mode="outlined"
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

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>⚙️ Ações</Text>
          
          <ActionButton 
            onPress={handleLogout} 
            icon="logout"
          >
            Trocar Professor
          </ActionButton>
          
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
        </Card.Content>
      </Card>

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
          >
          Limpar Todos os Dados
          </ActionButton>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>ℹ️ Sobre o App</Text>
          <Text style={styles.versionText}>
            🚀 Versão 1.0.0
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
  aboutText: { 
    fontSize: 16, 
    marginBottom: 4,
    fontWeight: '600',
    color: '#000000',
  },
  versionText: { 
    fontSize: 14, 
    fontStyle: 'italic', 
    color: '#666',
    marginBottom: 12,
  },
  featuresText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  featureItem: {
    fontSize: 13,
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
});

export default memo(SettingsScreen);