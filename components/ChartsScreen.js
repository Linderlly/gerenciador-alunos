import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Text as RNText
} from 'react-native';
import {
  Card,
  Text,
  Chip,
  SegmentedButtons,
  ProgressBar
} from 'react-native-paper';
import { 
  getStudents, 
  getClasses, 
  getCurrentClass, 
  getStudentPerformanceData, 
  getClassComparisonData, 
  getPerformanceDistribution,
  getClassStatistics
} from '../utils/storage';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

// Componente customizado para o status do aluno
const StatusBadge = memo(({ status, average }) => {
  const getStatusColor = (avg) => {
    if (avg >= 7) return '#4caf50';
    if (avg >= 5) return '#ff9800';
    return '#f44336';
  };

  const getStatusText = (avg) => {
    if (avg >= 7) return 'Aprovado';
    if (avg >= 5) return 'Recuperação';
    return 'Reprovado';
  };

  return (
    <View style={[
      styles.statusBadge,
      { 
        backgroundColor: getStatusColor(average) + '20',
        borderColor: getStatusColor(average)
      }
    ]}>
      <Text style={[
        styles.statusText,
        { color: getStatusColor(average) }
      ]}>
        {getStatusText(average)}
      </Text>
    </View>
  );
});

// Componente de gráfico de pizza para distribuição de desempenho
const PerformancePieChart = memo(({ distribution }) => {
  if (!distribution || distribution.length === 0) return null;

  const chartData = distribution.map(item => ({
    name: item.range,
    population: item.count,
    color: getRangeColor(item.range),
    legendFontColor: '#7F7F7F',
    legendFontSize: 12
  }));

  return (
    <Card style={styles.chartCard}>
      <Card.Content>
        <Text style={styles.chartTitle}>
          📊 Distribuição de Desempenho
        </Text>
        <PieChart
          data={chartData}
          width={width - 80}
          height={220}
          chartConfig={pieChartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
        <View style={styles.legendContainer}>
          {distribution.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor, 
                  { backgroundColor: getRangeColor(item.range) }
                ]} 
              />
              <RNText style={styles.legendText}>
                {item.range}: {item.count} alunos ({item.percentage.toFixed(1)}%)
              </RNText>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
});

// Componente de gráfico de barras para comparação de turmas
const ClassBarChart = memo(({ classData }) => {
  if (!classData || classData.length === 0) return null;

  const chartData = {
    labels: classData.map(item => item.className),
    datasets: [
      {
        data: classData.map(item => item.average)
      }
    ]
  };

  return (
    <Card style={styles.chartCard}>
      <Card.Content>
        <Text style={styles.chartTitle}>
          🏫 Comparação entre Turmas
        </Text>
        <BarChart
          data={chartData}
          width={width - 80}
          height={220}
          chartConfig={barChartConfig}
          verticalLabelRotation={30}
          fromZero
          showValuesOnTopOfBars
        />
        <View style={styles.statsGrid}>
          {classData.map((item, index) => (
            <View key={index} style={styles.classStat}>
              <Text style={styles.className}>{item.className}</Text>
              <Text style={styles.classAverage}>{item.average}</Text>
              <ProgressBar 
                progress={item.average / 10} 
                color={getAverageColor(item.average)}
                style={styles.classProgress}
              />
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
});

// Componente de gráfico de linha para desempenho individual
const StudentLineChart = memo(({ performanceData }) => {
  if (!performanceData || performanceData.length === 0) return null;

  const chartData = {
    labels: performanceData.map((_, index) => (index + 1).toString()),
    datasets: [
      {
        data: performanceData.map(item => item.average),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  return (
    <Card style={styles.chartCard}>
      <Card.Content>
        <Text style={styles.chartTitle}>
          📈 Desempenho dos Alunos (Ordenado por Média)
        </Text>
        <LineChart
          data={chartData}
          width={width - 80}
          height={220}
          chartConfig={lineChartConfig}
          bezier
          style={styles.lineChart}
        />
        <View style={styles.studentList}>
          {performanceData.slice(0, 5).map((student, index) => (
            <View key={index} style={styles.studentItem}>
              <Text style={styles.studentRank}>#{index + 1}</Text>
              <View style={styles.studentMainInfo}>
                <View style={styles.studentNameContainer}>
                  <Text style={styles.studentName} numberOfLines={1} ellipsizeMode="tail">
                    {student.name}
                  </Text>
                  <Text style={[
                    styles.studentAverage,
                    { color: getAverageColor(student.average) }
                  ]}>
                    Média: {student.average}
                  </Text>
                </View>
                <StatusBadge 
                  status={student.status} 
                  average={student.average} 
                />
              </View>
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
});

// Componente de estatísticas resumidas
const StatisticsSummary = memo(({ statistics, selectedClass }) => {
  return (
    <Card style={styles.summaryCard}>
      <Card.Content>
        <Text style={styles.summaryTitle}>
          📋 Estatísticas {selectedClass ? `- ${selectedClass.name}` : 'Geral'}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.totalStudents}</Text>
            <Text style={styles.statLabel}>Total de Alunos</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statistics.average}</Text>
            <Text style={styles.statLabel}>Média Geral</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statApproved]}>
              {statistics.approved}
            </Text>
            <Text style={styles.statLabel}>Aprovados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statRecovery]}>
              {statistics.recovery}
            </Text>
            <Text style={styles.statLabel}>Recuperação</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statFailed]}>
              {statistics.failed}
            </Text>
            <Text style={styles.statLabel}>Reprovados</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statRate]}>
              {statistics.approvalRate}%
            </Text>
            <Text style={styles.statLabel}>Taxa de Aprovação</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
});

function ChartsScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [currentClassId, setCurrentClassId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [chartType, setChartType] = useState('distribution');
  const [performanceData, setPerformanceData] = useState([]);
  const [classComparisonData, setClassComparisonData] = useState([]);
  const [performanceDistribution, setPerformanceDistribution] = useState([]);
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    average: 0,
    approved: 0,
    recovery: 0,
    failed: 0,
    approvalRate: 0
  });

  const loadData = useCallback(async () => {
    try {
      const [loadedStudents, loadedClasses, currentClass] = await Promise.all([
        getStudents(),
        getClasses(),
        getCurrentClass()
      ]);

      setStudents(loadedStudents);
      setClasses(loadedClasses);
      setCurrentClassId(currentClass || '');
      setSelectedClassId(currentClass || 'all');
    } catch (error) {
      console.log('Erro ao carregar dados:', error);
    }
  }, []);

  const updateCharts = useCallback(async () => {
    const classId = selectedClassId === 'all' ? null : selectedClassId;
    
    const [
      performance,
      classComparison,
      distribution,
      stats
    ] = await Promise.all([
      getStudentPerformanceData(classId),
      getClassComparisonData(),
      getPerformanceDistribution(classId),
      getClassStatistics(classId)
    ]);

    setPerformanceData(performance);
    setClassComparisonData(classComparison);
    setPerformanceDistribution(distribution);
    setStatistics(stats);
  }, [selectedClassId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });

    return unsubscribe;
  }, [navigation, loadData]);

  useEffect(() => {
    if (students.length > 0) {
      updateCharts();
    }
  }, [students, selectedClassId, updateCharts]);

  const selectedClass = selectedClassId === 'all' 
    ? null 
    : classes.find(cls => cls.id === selectedClassId);

  const renderChart = () => {
    switch (chartType) {
      case 'distribution':
        return (
          <PerformancePieChart distribution={performanceDistribution} />
        );
      case 'comparison':
        return (
          <ClassBarChart classData={classComparisonData} />
        );
      case 'performance':
        return (
          <StudentLineChart performanceData={performanceData} />
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <StatisticsSummary 
          statistics={statistics} 
          selectedClass={selectedClass}
        />

        <Card style={styles.controlsCard}>
          <Card.Content>
            <Text style={styles.controlsTitle}>
              🎯 Filtros e Visualizações
            </Text>
            
            <Text style={styles.filterLabel}>Selecionar Turma:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.classFilter}>
                <Chip
                  selected={selectedClassId === 'all'}
                  onPress={() => setSelectedClassId('all')}
                  style={[
                    styles.filterChip,
                    selectedClassId === 'all' && styles.selectedFilterChip
                  ]}
                  icon="format-list-bulleted"
                >
                  Todas as Turmas
                </Chip>
                {classes.map(classItem => (
                  <Chip
                    key={classItem.id}
                    selected={selectedClassId === classItem.id}
                    onPress={() => setSelectedClassId(classItem.id)}
                    style={[
                      styles.filterChip,
                      selectedClassId === classItem.id && styles.selectedFilterChip
                    ]}
                    icon="account-multiple"
                  >
                    {classItem.name}
                  </Chip>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.filterLabel}>Tipo de Gráfico:</Text>
            <SegmentedButtons
              value={chartType}
              onValueChange={setChartType}
              buttons={[
                {
                  value: 'distribution',
                  label: 'Distribuição',
                  icon: 'chart-pie'
                },
                {
                  value: 'comparison',
                  label: 'Comparação',
                  icon: 'chart-bar'
                },
                {
                  value: 'performance',
                  label: 'Desempenho',
                  icon: 'chart-line'
                }
              ]}
              style={styles.segmentedButtons}
            />
          </Card.Content>
        </Card>

        {students.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>
                Nenhum dado disponível
              </Text>
              <Text style={styles.emptyText}>
                Adicione alunos e notas para visualizar os gráficos de desempenho
              </Text>
            </Card.Content>
          </Card>
        ) : (
          renderChart()
        )}

        {performanceData.length > 0 && chartType === 'performance' && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text style={styles.infoTitle}>
                💡 Informações
              </Text>
              <Text style={styles.infoText}>
                O gráfico mostra o desempenho dos alunos ordenado por média. 
                Cada ponto representa um aluno, permitindo visualizar a distribuição 
                geral do desempenho da turma.
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

// Funções auxiliares
const getRangeColor = (range) => {
  switch (range) {
    case '0-4.9': return '#f44336';
    case '5-6.9': return '#ff9800';
    case '7-10': return '#4caf50';
    default: return '#666';
  }
};

const getAverageColor = (average) => {
  if (average >= 7) return '#4caf50';
  if (average >= 5) return '#ff9800';
  return '#f44336';
};

// Configurações dos gráficos
const pieChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
};

const barChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  barPercentage: 0.7,
};

const lineChartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#1976d2'
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f6f6f6',
  },
  summaryCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statItem: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196f3',
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
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  controlsCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000000',
  },
  classFilter: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 4,
  },
  filterChip: {
    marginRight: 8,
  },
  selectedFilterChip: {
    backgroundColor: '#2196f3',
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  chartCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
    textAlign: 'center',
  },
  legendContainer: {
    marginTop: 10,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  statsGrid: {
    marginTop: 15,
    gap: 10,
  },
  classStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  className: {
    flex: 2,
    fontSize: 14,
    color: '#000000',
  },
  classAverage: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196f3',
    textAlign: 'center',
  },
  classProgress: {
    flex: 3,
    height: 8,
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  studentList: {
    marginTop: 15,
    gap: 12,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minHeight: 70,
  },
  studentRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    width: 35,
    textAlign: 'center',
  },
  studentMainInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  studentNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  studentAverage: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Estilos do Status Badge customizado
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    lineHeight: 20,
  },
  infoCard: {
    marginBottom: 20,
    backgroundColor: '#e3f2fd',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});

export default memo(ChartsScreen);