// screens/AIAssistantScreen.js
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator
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
  getStudentInsights,
  StorageService
} from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;

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

        {analysis.insights && analysis.insights.length > 0 ? (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>💡 Insights Detectados:</Text>
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
            <Text style={styles.noInsightsSubtext}>
              Continue acompanhando o desempenho para receber análises.
            </Text>
          </View>
        )}

        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <Text style={styles.sectionTitle}>🎯 Recomendações:</Text>
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

// Componente de Análise da Turma
const ClassAnalysisCard = memo(({ analysis, onRefresh }) => {
  if (!analysis) return null;

  return (
    <Card style={styles.analysisCard}>
      <Card.Content>
        <View style={styles.analysisHeader}>
          <Text style={styles.analysisTitle}>
            🏫 Análise da Turma
          </Text>
          <IconButton
            icon="refresh"
            size={isSmallScreen ? 20 : 24}
            onPress={onRefresh}
          />
        </View>

        <View style={styles.performanceStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysis.totalStudents}</Text>
            <Text style={styles.statLabel}>Total Alunos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysis.studentsWithIssues}</Text>
            <Text style={styles.statLabel}>Precisam de Atenção</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{analysis.studentsExcelling}</Text>
            <Text style={styles.statLabel}>Excelentes</Text>
          </View>
        </View>

        {analysis.insights && analysis.insights.length > 0 ? (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>💡 Insights da Turma:</Text>
            {analysis.insights.slice(0, 5).map((insight, index) => (
              <InsightCard
                key={index}
                insight={insight}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noInsightsContainer}>
            <Text style={styles.noInsightsText}>
              Nenhum insight detectado para a turma.
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
});

function AIAssistantScreen({ navigation }) {
  const { getDisplayName } = useAuth();
  
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

  /**
   * Carregar dados iniciais
   */
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
      console.error('Erro ao carregar dados do assistente:', error);
    }
  }, []);

  /**
   * Analisar desempenho da turma atual
   */
  const analyzeCurrentClass = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      // Em uma implementação real, isso chamaria uma API de IA
      // Por enquanto, usamos análise básica com os dados existentes
      const analysis = await analyzeClassPerformance(currentClassId);
      
      if (analysis) {
        setClassAnalysis(analysis);
        await loadData(); // Recarregar insights atualizados
        Alert.alert(
          '✅ Análise Concluída', 
          `Foram gerados ${analysis?.insights?.length || 0} insights para a turma.`
        );
      } else {
        // Análise simulada para demonstração
        const simulatedAnalysis = {
          totalStudents: students.filter(s => s.classId === currentClassId).length,
          studentsWithIssues: students.filter(s => s.classId === currentClassId && s.average < 7).length,
          studentsExcelling: students.filter(s => s.classId === currentClassId && s.average >= 8).length,
          insights: [
            {
              type: 'class_performance',
              severity: 'positive',
              message: 'Turma com bom desempenho geral',
              description: 'A maioria dos alunos está com médias satisfatórias',
              icon: '📈'
            }
          ],
          timestamp: new Date().toISOString()
        };
        
        setClassAnalysis(simulatedAnalysis);
        Alert.alert('✅ Análise Concluída', 'Análise da turma realizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao analisar turma:', error);
      Alert.alert('❌ Erro', 'Não foi possível analisar a turma');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentClassId, students, loadData]);

  /**
   * Analisar desempenho individual do aluno
   */
  const analyzeStudent = useCallback(async (studentId) => {
    setIsAnalyzing(true);
    try {
      // Em uma implementação real, isso chamaria uma API de IA
      const analysis = await analyzeStudentPerformance(studentId);
      
      if (analysis) {
        setStudentAnalysis(analysis);
        setActiveTab('student');
      } else {
        // Análise simulada para demonstração
        const student = students.find(s => s.id === studentId);
        if (student) {
          const simulatedAnalysis = {
            studentId: student.id,
            studentName: student.name,
            currentAverage: student.average,
            previousAverage: student.average * (0.85 + Math.random() * 0.3),
            changePercentage: ((student.average - (student.average * 0.9)) / (student.average * 0.9)) * 100,
            notesCount: student.notes.length,
            daysSinceLastUpdate: Math.floor(Math.random() * 30),
            insights: generateStudentInsights(student),
            recommendations: generateStudentRecommendations(student),
            timestamp: new Date().toISOString()
          };
          
          setStudentAnalysis(simulatedAnalysis);
          setActiveTab('student');
        }
      }
    } catch (error) {
      console.error('Erro ao analisar aluno:', error);
      Alert.alert('❌ Erro', 'Não foi possível analisar o aluno');
    } finally {
      setIsAnalyzing(false);
    }
  }, [students]);

  /**
   * Gerar insights simulados para aluno
   */
  const generateStudentInsights = (student) => {
    const insights = [];
    
    if (student.average >= 8) {
      insights.push({
        type: 'excellent_performance',
        severity: 'positive',
        message: 'Desempenho excelente',
        description: 'O aluno está entre os melhores da turma',
        icon: '⭐'
      });
    } else if (student.average >= 7) {
      insights.push({
        type: 'good_performance',
        severity: 'positive',
        message: 'Bom desempenho',
        description: 'O aluno está no caminho certo',
        icon: '✅'
      });
    } else if (student.average < 5) {
      insights.push({
        type: 'low_performance',
        severity: 'high',
        message: 'Desempenho abaixo do esperado',
        description: 'O aluno precisa de apoio adicional',
        icon: '🔍'
      });
    }

    if (student.notes.length < 3) {
      insights.push({
        type: 'few_assessments',
        severity: 'low',
        message: 'Poucas avaliações registradas',
        description: 'Considere aumentar a frequência de avaliações',
        icon: '📝'
      });
    }

    return insights;
  };

  /**
   * Gerar recomendações simuladas para aluno
   */
  const generateStudentRecommendations = (student) => {
    const recommendations = [];
    
    if (student.average < 5) {
      recommendations.push('Implementar plano de recuperação');
      recommendations.push('Oferecer plantão de dúvidas');
      recommendations.push('Agendar conversa com os responsáveis');
    } else if (student.average >= 8) {
      recommendations.push('Oferecer atividades de ampliação');
      recommendations.push('Incentivar participação em olimpíadas');
    }

    if (student.notes.length < 3) {
      recommendations.push('Aumentar a quantidade de avaliações formativas');
    }

    return recommendations;
  };

  /**
   * Atualizar dados via pull-to-refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await StorageService.syncAllData();
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  /**
   * Navegar para análise do aluno
   */
  const handleStudentPress = useCallback((studentId) => {
    setSelectedStudentId(studentId);
    analyzeStudent(studentId);
  }, [analyzeStudent]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recarregar quando a tela receber foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation, loadData]);

  const currentClass = classes.find(cls => cls.id === currentClassId);
  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Filtrar insights recentes
  const recentInsights = insights
    .filter(insight => insight.type === 'class_analysis')
    .flatMap(insight => insight.data?.insights || [])
    .slice(0, 10);

  /**
   * Renderizar visão geral
   */
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
            disabled={isAnalyzing || !currentClassId}
            style={styles.analyzeButton}
            contentStyle={styles.analyzeButtonContent}
            icon="robot"
          >
            {isAnalyzing ? 'Analisando...' : 'Analisar Turma Atual'}
          </Button>

          {currentClass ? (
            <Text style={styles.classInfo}>
              🏫 Turma: {currentClass.name} - {currentClass.subject}
            </Text>
          ) : (
            <Text style={styles.noClassInfo}>
              ⚠️ Selecione uma turma atual para análise
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Análise da Turma */}
      {classAnalysis && (
        <ClassAnalysisCard
          analysis={classAnalysis}
          onRefresh={analyzeCurrentClass}
        />
      )}

      {/* Lista de Alunos para Análise */}
      <Card style={styles.studentsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>
            👥 Alunos para Análise
          </Text>
          <Text style={styles.sectionSubtitle}>
            Selecione um aluno para análise individual detalhada
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

      {/* Insights Recentes */}
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

      {/* Informações Adicionais */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.infoTitle}>
            ℹ️ Sobre o Assistente IA
          </Text>
          <Text style={styles.infoText}>
            • Analisa padrões de desempenho dos alunos
          </Text>
          <Text style={styles.infoText}>
            • Identifica necessidades de intervenção
          </Text>
          <Text style={styles.infoText}>
            • Sugere ações pedagógicas personalizadas
          </Text>
          <Text style={styles.infoText}>
            • Acompanha a evolução ao longo do tempo
          </Text>
        </Card.Content>
      </Card>
    </View>
  );

  /**
   * Renderizar análise individual do aluno
   */
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
            <Button 
              mode="contained" 
              onPress={() => setActiveTab('overview')}
              style={styles.backButton}
              icon="arrow-left"
              contentStyle={styles.buttonContent}
            >
              Voltar para Visão Geral
            </Button>
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
        {/* Seletor de Abas */}
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

        {/* Conteúdo Baseado na Aba Selecionada */}
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
    borderRadius: isSmallScreen ? 10 : 12,
    elevation: 2,
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
    borderRadius: 8,
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
  noClassInfo: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#ff9800',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  studentsCard: {
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 8 : 10,
    color: '#000000',
  },
  sectionSubtitle: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#666',
    marginBottom: isSmallScreen ? 10 : 12,
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
    borderRadius: isSmallScreen ? 10 : 12,
    elevation: 2,
  },
  insightsList: {
    gap: isSmallScreen ? 10 : 12,
  },
  insightCard: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    borderRadius: isSmallScreen ? 8 : 10,
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
    borderRadius: isSmallScreen ? 10 : 12,
    elevation: 2,
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
  noInsightsSubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: isSmallScreen ? 12 : 13,
    marginTop: 4,
  },
  recommendationsContainer: {
    marginTop: isSmallScreen ? 8 : 12,
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
  infoCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: isSmallScreen ? 10 : 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isSmallScreen ? 8 : 10,
    color: '#1976d2',
  },
  infoText: {
    fontSize: isSmallScreen ? 13 : 14,
    color: '#1976d2',
    marginBottom: isSmallScreen ? 4 : 6,
    lineHeight: isSmallScreen ? 16 : 18,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: isSmallScreen ? 10 : 12,
    elevation: 2,
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
    marginBottom: isSmallScreen ? 16 : 20,
  },
  backButton: {
    marginTop: isSmallScreen ? 8 : 10,
  },
  buttonContent: {
    height: isSmallScreen ? 44 : 48,
  },
});

export default memo(AIAssistantScreen);