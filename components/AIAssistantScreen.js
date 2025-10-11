import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  Divider,
  IconButton,
  SegmentedButtons
} from 'react-native-paper';
import {
  getRecentInsights,
  analyzeClassPerformance,
  getCurrentClass,
  getClasses,
  getStudents,
  analyzeStudentPerformance,
  getStudentInsights
} from '../utils/storage';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;

// Componente de Insight Individual
const InsightCard = memo(({ insight, onStudentPress }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#ffc107';
      case 'positive': return '#4caf50';
      default: return '#2196f3';
    }
  };

  const getSeverityText = (severity) => {
    switch (severity) {
      case 'high': return 'Alta Prioridade';
      case 'medium': return 'Atenção';
      case 'low': return 'Monitorar';
      case 'positive': return 'Positivo';
      default: return 'Informação';
    }
  };

  return (
    <Card style={styles.insightCard}>
      <Card.Content style={styles.insightCardContent}>
        <View style={styles.insightHeader}>
          <View style={styles.insightIcon}>
            <Text style={styles.iconText}>{insight.icon}</Text>
          </View>
          <View style={styles.insightInfo}>
            <Text style={styles.insightMessage} numberOfLines={2}>
              {insight.message}
            </Text>
            {insight.studentName && (
              <Chip
                mode="outlined"
                onPress={() => onStudentPress && onStudentPress(insight.studentId)}
                style={styles.studentChip}
                textStyle={styles.studentChipText}
              >
                👤 {insight.studentName}
              </Chip>
            )}
          </View>
        </View>
        
        <Text style={styles.insightDescription} numberOfLines={3}>
          {insight.description}
        </Text>
        
        <View style={styles.severityContainer}>
          <Chip
            mode="flat"
            textStyle={{ 
              color: 'white', 
              fontSize: isSmallScreen ? 10 : 12,
              lineHeight: isSmallScreen ? 14 : 16 
            }}
            style={[
              styles.severityChip, 
              { 
                backgroundColor: getSeverityColor(insight.severity),
                minHeight: isSmallScreen ? 24 : 28
              }
            ]}
          >
            {getSeverityText(insight.severity)}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );
});

// Componente de Análise de Aluno
const StudentAnalysisCard = memo(({ analysis, onRefresh }) => {
  if (!analysis) return null;

  return (
    <Card style={styles.analysisCard}>
      <Card.Content>
        <View style={styles.analysisHeader}>
          <Text style={styles.analysisTitle} numberOfLines={2}>
            📊 Análise de {analysis.studentName}
          </Text>
          <IconButton
            icon="refresh"
            size={isSmallScreen ? 20 : 24}
            onPress={onRefresh}
          />
        </View>

        <View style={styles.performanceStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysis.currentAverage.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Média Atual</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[
              styles.statValue,
              { color: analysis.changePercentage >= 0 ? '#4caf50' : '#f44336' }
            ]}>
              {analysis.changePercentage >= 0 ? '+' : ''}{analysis.changePercentage}%
            </Text>
            <Text style={styles.statLabel}>Variação</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysis.notesCount}</Text>
            <Text style={styles.statLabel}>Avaliações</Text>
          </View>
        </View>

        {analysis.insights.length > 0 ? (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>Insights Detectados:</Text>
            {analysis.insights.map((insight, index) => (
              <InsightCard
                key={index}
                insight={insight}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noInsightsContainer}>
            <Text style={styles.noInsightsText}>
              Nenhum insight detectado para este aluno.
            </Text>
          </View>
        )}

        {analysis.recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>Recomendações:</Text>
            {analysis.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.recommendationIcon}>💡</Text>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
});

function AIAssistantScreen({ navigation }) {
  const [insights, setInsights] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentAnalysis, setStudentAnalysis] = useState(null);
  const [classAnalysis, setClassAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [loadedInsights, loadedStudents, loadedClasses, currentClass] = await Promise.all([
        getRecentInsights(20),
        getStudents(),
        getClasses(),
        getCurrentClass()
      ]);

      setInsights(loadedInsights);
      setStudents(loadedStudents);
      setClasses(loadedClasses);
      setCurrentClassId(currentClass || '');
    } catch (error) {
      console.log('Erro ao carregar dados:', error);
    }
  }, []);

  const analyzeCurrentClass = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeClassPerformance(currentClassId);
      setClassAnalysis(analysis);
      await loadData(); // Recarregar insights atualizados
      Alert.alert('✅ Análise Concluída', `Foram gerados ${analysis?.insights?.length || 0} insights para a turma.`);
    } catch (error) {
      Alert.alert('❌ Erro', 'Não foi possível analisar a turma');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentClassId, loadData]);

  const analyzeStudent = useCallback(async (studentId) => {
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeStudentPerformance(studentId);
      setStudentAnalysis(analysis);
      setActiveTab('student');
    } catch (error) {
      Alert.alert('❌ Erro', 'Não foi possível analisar o aluno');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleStudentPress = useCallback((studentId) => {
    setSelectedStudentId(studentId);
    analyzeStudent(studentId);
  }, [analyzeStudent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation, loadData]);

  const currentClass = classes.find(cls => cls.id === currentClassId);
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const recentInsights = insights
    .filter(insight => insight.type === 'class_analysis')
    .flatMap(insight => insight.data.insights || [])
    .slice(0, 10);

  const renderOverview = () => (
    <View style={styles.overviewContainer}>
      <Card style={styles.actionCard}>
        <Card.Content style={styles.actionCardContent}>
          <Text style={styles.actionTitle}>
            🤖 Assistente de Análise
          </Text>
          <Text style={styles.actionDescription}>
            Analise o desempenho dos alunos e receba insights inteligentes sobre o progresso da turma.
          </Text>
          
          <Button
            mode="contained"
            onPress={analyzeCurrentClass}
            loading={isAnalyzing}
            disabled={isAnalyzing}
            style={styles.analyzeButton}
            contentStyle={styles.analyzeButtonContent}
            icon="robot"
          >
            {isAnalyzing ? 'Analisando...' : 'Analisar Turma Atual'}
          </Button>

          {currentClass && (
            <Text style={styles.classInfo}>
              🏫 Turma: {currentClass.name} - {currentClass.subject}
            </Text>
          )}
        </Card.Content>
      </Card>

      {classAnalysis && (
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              📋 Resumo da Análise
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{classAnalysis.totalStudents}</Text>
                <Text style={styles.summaryLabel}>Alunos</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{classAnalysis.studentsWithIssues}</Text>
                <Text style={styles.summaryLabel}>Precisam de Atenção</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>{classAnalysis.studentsExcelling}</Text>
                <Text style={styles.summaryLabel}>Excelentes</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.studentsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>
            👥 Alunos para Análise
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.studentsScrollContent}
          >
            <View style={styles.studentsList}>
              {students.slice(0, 10).map(student => (
                <Chip
                  key={student.id}
                  selected={selectedStudentId === student.id}
                  onPress={() => handleStudentPress(student.id)}
                  style={[
                    styles.studentChip,
                    selectedStudentId === student.id && styles.selectedStudentChip
                  ]}
                  textStyle={styles.studentChipText}
                  icon="account"
                >
                  {student.name}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </Card.Content>
      </Card>

      {recentInsights.length > 0 && (
        <Card style={styles.insightsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              💡 Insights Recentes
            </Text>
            <View style={styles.insightsList}>
              {recentInsights.map((insight, index) => (
                <InsightCard
                  key={index}
                  insight={insight}
                  onStudentPress={handleStudentPress}
                />
              ))}
            </View>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  const renderStudentAnalysis = () => (
    <View style={styles.studentAnalysisContainer}>
      {selectedStudent && studentAnalysis ? (
        <StudentAnalysisCard
          analysis={studentAnalysis}
          onRefresh={() => analyzeStudent(selectedStudentId)}
        />
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <Text style={styles.emptyIcon}>👤</Text>
            <Text style={styles.emptyTitle}>
              Selecione um aluno
            </Text>
            <Text style={styles.emptyText}>
              Escolha um aluno da lista para ver a análise detalhada
            </Text>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1976d2']}
            tintColor="#1976d2"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: 'overview',
              label: 'Visão Geral',
              icon: 'view-dashboard'
            },
            {
              value: 'student',
              label: 'Análise Individual',
              icon: 'account'
            }
          ]}
          style={styles.segmentedButtons}
        />

        {activeTab === 'overview' ? renderOverview() : renderStudentAnalysis()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  scrollContent: {
    flexGrow: 1,
    padding: isSmallScreen ? 8 : 12,
  },
  segmentedButtons: {
    marginBottom: isSmallScreen ? 12 : 16,
  },
  overviewContainer: {
    gap: isSmallScreen ? 12 : 16,
  },
  studentAnalysisContainer: {
    gap: isSmallScreen ? 12 : 16,
  },
  actionCard: {
    backgroundColor: '#ffffff',
  },
  actionCardContent: {
    padding: isSmallScreen ? 12 : 16,
  },
  actionTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 6 : 8,
    color: '#000000',
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    marginBottom: isSmallScreen ? 12 : 16,
    lineHeight: isSmallScreen ? 18 : 20,
    textAlign: 'center',
  },
  analyzeButton: {
    marginBottom: isSmallScreen ? 10 : 12,
  },
  analyzeButtonContent: {
    height: isSmallScreen ? 44 : 48,
  },
  classInfo: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1976d2',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: isSmallScreen ? 8 : 12,
  },
  summaryItem: {
    alignItems: 'center',
    minWidth: isSmallScreen ? 70 : 80,
  },
  summaryNumber: {
    fontSize: isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: isSmallScreen ? 12 : 14,
  },
  studentsCard: {
    backgroundColor: '#ffffff',
  },
  studentsScrollContent: {
    paddingHorizontal: isSmallScreen ? 8 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
  },
  studentsList: {
    flexDirection: 'row',
    gap: isSmallScreen ? 6 : 8,
  },
  studentChip: {
    marginRight: isSmallScreen ? 6 : 8,
    maxWidth: isSmallScreen ? 120 : 140,
  },
  studentChipText: {
    fontSize: isSmallScreen ? 12 : 13,
    lineHeight: isSmallScreen ? 16 : 18,
  },
  selectedStudentChip: {
    backgroundColor: '#2196f3',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
  },
  insightsList: {
    gap: isSmallScreen ? 10 : 12,
  },
  insightCard: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  insightCardContent: {
    padding: isSmallScreen ? 12 : 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 6 : 8,
  },
  insightIcon: {
    marginRight: isSmallScreen ? 10 : 12,
    marginTop: 2,
  },
  iconText: {
    fontSize: isSmallScreen ? 18 : 20,
  },
  insightInfo: {
    flex: 1,
  },
  insightMessage: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: isSmallScreen ? 3 : 4,
    lineHeight: isSmallScreen ? 18 : 20,
  },
  insightDescription: {
    fontSize: isSmallScreen ? 12 : 14,
    color: '#666',
    marginBottom: isSmallScreen ? 6 : 8,
    lineHeight: isSmallScreen ? 16 : 18,
  },
  severityContainer: {
    alignSelf: 'flex-start',
  },
  severityChip: {
    minHeight: isSmallScreen ? 24 : 28,
  },
  analysisCard: {
    backgroundColor: '#ffffff',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 12 : 16,
  },
  analysisTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
    marginRight: 8,
    lineHeight: isSmallScreen ? 20 : 24,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: isSmallScreen ? 12 : 16,
    padding: isSmallScreen ? 12 : 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
    minWidth: isSmallScreen ? 70 : 80,
  },
  statValue: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: isSmallScreen ? 10 : 12,
    color: '#666',
    textAlign: 'center',
  },
  insightsContainer: {
    marginBottom: isSmallScreen ? 12 : 16,
    gap: isSmallScreen ? 10 : 12,
  },
  noInsightsContainer: {
    padding: isSmallScreen ? 12 : 16,
    alignItems: 'center',
  },
  noInsightsText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    fontSize: isSmallScreen ? 13 : 14,
    lineHeight: isSmallScreen ? 18 : 20,
  },
  recommendationsContainer: {
    marginTop: isSmallScreen ? 8 : 12,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 15 : 16,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 10 : 12,
    color: '#000000',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: isSmallScreen ? 6 : 8,
    padding: isSmallScreen ? 8 : 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  recommendationIcon: {
    marginRight: isSmallScreen ? 6 : 8,
    fontSize: isSmallScreen ? 14 : 16,
    marginTop: 1,
  },
  recommendationText: {
    flex: 1,
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1976d2',
    lineHeight: isSmallScreen ? 16 : 18,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: isSmallScreen ? 30 : 40,
    paddingHorizontal: isSmallScreen ? 20 : 30,
  },
  emptyIcon: {
    fontSize: isSmallScreen ? 40 : 48,
    marginBottom: isSmallScreen ? 12 : 16,
  },
  emptyTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 6 : 8,
    color: '#666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: isSmallScreen ? 13 : 14,
    textAlign: 'center',
    color: '#999',
    lineHeight: isSmallScreen ? 18 : 20,
  },
});

export default memo(AIAssistantScreen);