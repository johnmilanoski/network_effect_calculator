import { useState, useMemo } from 'react';
import { Settings, Target, DollarSign, Users, Clock } from 'lucide-react';

interface Course {
  name: string;
  price: number;
}

interface Settings {
  multiplier: number;
  percentages: number[];
  useUniformPercentage: boolean;
  uniformPercentage: number;
  payoutLevels: number;
  reservePercentage: number;
  numberOfPeriods: number;
  periodName: string;
}

interface LevelData {
  level: number;
  students: number;
  percentage: number;
  earningsPerStudent: number;
  levelEarnings: number;
  totalEarnings: number;
  targetMet: boolean;
  isPaidLevel: boolean;
}

interface NetworkLevelResult {
  levels: LevelData[];
  targetLevel: number;
  studentsAtTargetLevel: number;
  totalStudentsNeeded: number;
  walletEarnings?: number; // This is calculated later
}

interface CourseProgressionState {
  courseIndex: number;
  course: Course;
  targetPrice: number | null;
  levels: LevelData[];
  activeSponsorCount: number;
  totalNetworkSize: number;
  targetMet: boolean;
  isFinal: boolean;
  targetLevel: number;
  studentsAtTargetLevel: number;
  studentsNeededForTarget: number;
  walletEarnings: number;
}

interface FullCascadeSnapshot {
  totalNetworkSize: number;
  totalRequiredDepth: number;
  depthDetails: { courseName: string; requiredDepth: number; trigger: string }[];
}

interface TimePeriodData {
  period: number;
  courseEarnings: { [courseName: string]: number };
  totalPeriodEarnings: number;
  cumulativeWallet: number;
  unlockedCourses: string[];
  newStudents: number;
  totalStudents: number;
}

const CALCULATION_LEVEL_LIMIT = 40; // A generous limit for calculations to find target levels.

const EducationNetworkCalculator = () => {
  const initialCourses: Course[] = [
    { name: 'Course 1', price: 15 },
    { name: 'Course 2', price: 100 },
    { name: 'Course 3', price: 500 },
    { name: 'Course 4', price: 2500 },
    { name: 'Course 5', price: 7500 },
    { name: 'Course 6', price: 32500 }
  ];

  const [settings, setSettings] = useState<Settings>({
    multiplier: 3,
    percentages: new Array(10).fill(15),
    useUniformPercentage: true,
    uniformPercentage: 15,
    payoutLevels: 6, // How many levels actually get paid
    reservePercentage: 100, // Percentage of earnings held to meet target
    numberOfPeriods: 20, // Number of time periods to simulate
    periodName: 'Week',
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showTimeSettingsModal, setShowTimeSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [courses, setCourses] = useState<Course[]>(initialCourses);


    const effectivePercentages = useMemo(() => {
    if (settings.useUniformPercentage) {
      return new Array(settings.payoutLevels).fill(settings.uniformPercentage);
    }
    const customPercentages = [...settings.percentages];
    while (customPercentages.length < settings.payoutLevels) {
      customPercentages.push(15); // Default value for new levels
    }
    return customPercentages.slice(0, settings.payoutLevels);
  }, [settings.useUniformPercentage, settings.uniformPercentage, settings.payoutLevels, settings.percentages]);


  const calculateNetworkLevels = (coursePrice: number, targetAmount: number, percentages: number[], multiplier: number, payoutLevels: number, displayLevels: number, reservePercentage: number): NetworkLevelResult => {
    const levels: LevelData[] = [];
    let totalEarnings = 0;
    let accumulatedForTarget = 0;
    let targetMet = false;
    let targetLevel = -1;
    let studentsAtTargetLevel = 0;
    const reserveRatio = reservePercentage / 100;
    
    for (let level = 1; level <= displayLevels; level++) {
      const studentsAtLevel = Math.pow(multiplier, level);
      const levelIndex = level - 1;
      
      // Only apply percentage if within payout levels, otherwise 0%
      const percentage = level <= payoutLevels ? (percentages[levelIndex] || 0) : 0;
      const totalCommissionPerStudent = (coursePrice * percentage) / 100;
      const levelEarnings = studentsAtLevel * totalCommissionPerStudent;
      const earningsForTargetPerStudent = totalCommissionPerStudent * reserveRatio;
      
      if (!targetMet && earningsForTargetPerStudent > 0 && targetAmount > 0) {
        const remainingNeeded = targetAmount - accumulatedForTarget;
        if (remainingNeeded <= (levelEarnings * reserveRatio)) {
          targetMet = true;
          targetLevel = level;
          studentsAtTargetLevel = Math.ceil(remainingNeeded / earningsForTargetPerStudent);
        }
      }
      
      accumulatedForTarget += levelEarnings * reserveRatio;
      totalEarnings += levelEarnings;
      
      levels.push({
        level,
        students: studentsAtLevel,
        percentage,
        earningsPerStudent: totalCommissionPerStudent,
        levelEarnings,
        totalEarnings,
        targetMet: targetAmount > 0 && accumulatedForTarget >= targetAmount,
        isPaidLevel: level <= payoutLevels
      });
    }

    let totalNeeded = 0;
    if (targetLevel > 0) {
      for (let i = 0; i < targetLevel - 1; i++) {
        totalNeeded += levels[i].students;
      }
      totalNeeded += studentsAtTargetLevel;
    }

    return {
      levels,
      targetLevel,
      studentsAtTargetLevel,
      totalStudentsNeeded: totalNeeded
    };
  };

  const cascadeVisualizationDepths = useMemo(() => {
    if (courses.length === 0) return [];

    const depths = new Array(courses.length).fill(0);
    let cumulativeDepth = 0;

    // Iterate backwards from the final course to the first.
    for (let i = courses.length - 1; i >= 0; i--) {
      let stepDepth = 0;

      if (i === courses.length - 1) {
        // For the final course, show up to the number of payout levels.
        stepDepth = settings.payoutLevels;
      } else {
        // For other courses, show up to the level where the target for the *next* course is met.
        const result = calculateNetworkLevels(courses[i].price, courses[i + 1].price, effectivePercentages, settings.multiplier, settings.payoutLevels, CALCULATION_LEVEL_LIMIT, settings.reservePercentage);
        stepDepth = result.targetLevel > 0 ? result.targetLevel : 0;
      }

      cumulativeDepth += stepDepth;
      depths[i] = cumulativeDepth;
    }
    return depths;
  }, [courses, settings.payoutLevels, settings.multiplier, effectivePercentages, settings.reservePercentage]);

  const progressionStates: CourseProgressionState[] = useMemo(() => {
    const states: CourseProgressionState[] = [];

    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const targetPrice = i < courses.length - 1 && courses[i + 1].price > 0 ? courses[i + 1].price : null;
      const isFinal = !targetPrice;
      const displayDepth = cascadeVisualizationDepths[i] > 0 ? cascadeVisualizationDepths[i] : settings.payoutLevels;

      const activeSponsorCount = 1;

      const result = calculateNetworkLevels(
        course.price,
        isFinal ? 0 : targetPrice!,
        effectivePercentages,
        settings.multiplier,
        settings.payoutLevels,
        displayDepth,
        settings.reservePercentage
      );

      let walletEarnings = 0;
      let accumulatedForTarget = 0;
      const reserveRatio = settings.reservePercentage / 100;
      const targetPriceForThisCourse = isFinal ? 0 : targetPrice!;

      for (const level of result.levels) {
        if (!level.isPaidLevel) continue;

        const levelCommission = level.levelEarnings;

        if (targetPriceForThisCourse > 0 && accumulatedForTarget < targetPriceForThisCourse) {
          const remainingNeededForTarget = targetPriceForThisCourse - accumulatedForTarget;
          const potentialLevelContributionToTarget = levelCommission * reserveRatio;

          if (reserveRatio > 0 && remainingNeededForTarget < potentialLevelContributionToTarget) {
            const commissionToHitTarget = remainingNeededForTarget / reserveRatio;
            const commissionAfterTarget = levelCommission - commissionToHitTarget;
            walletEarnings += commissionToHitTarget * (1 - reserveRatio);
            walletEarnings += commissionAfterTarget;
            accumulatedForTarget = targetPriceForThisCourse;
          } else {
            walletEarnings += levelCommission * (1 - reserveRatio);
            accumulatedForTarget += potentialLevelContributionToTarget;
          }
        } else {
          walletEarnings += levelCommission;
        }
      }

      states.push({
        courseIndex: i,
        course,
        targetPrice,
        isFinal,
        levels: result.levels,
        activeSponsorCount,
        totalNetworkSize: result.levels.reduce((sum, l) => sum + l.students, 0),
        targetMet: result.totalStudentsNeeded > 0,
        targetLevel: result.targetLevel,
        studentsAtTargetLevel: result.studentsAtTargetLevel,
        studentsNeededForTarget: result.totalStudentsNeeded,
        walletEarnings: Math.max(0, walletEarnings),
      });
    }
    return states;
  }, [courses, settings, effectivePercentages, cascadeVisualizationDepths]);

  const endStateSnapshot: FullCascadeSnapshot = useMemo(() => {
    if (courses.length === 0) return { totalNetworkSize: 0, totalRequiredDepth: 0, depthDetails: [] };

    const depthDetails: { courseName: string; requiredDepth: number; trigger: string }[] = [];
    let totalRequiredDepth = 0;

    // Iterate backwards from the final course to the first.
    for (let i = courses.length - 1; i >= 0; i--) {
      const currentCourse = courses[i];
      let stepDepth = 0;
      let trigger = '';

      if (i === courses.length - 1) {
        // For the final course, the depth is the number of payout levels.
        stepDepth = settings.payoutLevels;
        trigger = `For full payout in ${currentCourse.name}`;
      } else {
        // For preceding courses, calculate the depth needed to earn the price of the next course.
        const nextCourse = courses[i + 1];
        const target = nextCourse.price;
        const result = calculateNetworkLevels(
          currentCourse.price,
          target,
          effectivePercentages,
          settings.multiplier,
          settings.payoutLevels,
          CALCULATION_LEVEL_LIMIT,
          settings.reservePercentage
        );
        stepDepth = result.targetLevel > 0 ? result.targetLevel : 0;
        trigger = `To graduate from ${currentCourse.name} to ${nextCourse.name}`;
      }

      totalRequiredDepth += stepDepth;
      depthDetails.unshift({ courseName: currentCourse.name, requiredDepth: stepDepth, trigger });
    }

    let totalNetworkSize = 0;
    for (let j = 1; j <= totalRequiredDepth; j++) {
      totalNetworkSize += Math.pow(settings.multiplier, j);
    }

    return { totalNetworkSize, totalRequiredDepth, depthDetails };
  }, [courses, settings, effectivePercentages]);

  const timeSeriesData: TimePeriodData[] = useMemo(() => {
    const series: TimePeriodData[] = [];
    if (courses.length === 0) return series;

    // Simulation state
    const unlockedCourseStatus = new Array(courses.length).fill(false);
    unlockedCourseStatus[0] = true;
    const networkDepths = new Array(courses.length).fill(0);
    const targetSavings = new Array(courses.length).fill(0);
    let cumulativeWallet = 0;
    let totalStudentsInCourse1 = 0;
    const reserveRatio = settings.reservePercentage / 100;

    for (let period = 1; period <= settings.numberOfPeriods; period++) {
        const periodEarnings: { [courseName: string]: number } = {};
        let totalPeriodEarnings = 0;
        let newStudentsThisPeriod = 0;

        for (let i = 0; i < courses.length; i++) {
            if (!unlockedCourseStatus[i]) {
                periodEarnings[courses[i].name] = 0;
                continue;
            }

            // Grow the network by one level
            networkDepths[i]++;
            const newLevel = networkDepths[i];
            
            // Calculate earnings from this new level only
            const studentsInNewLevel = Math.pow(settings.multiplier, newLevel);

            if (i === 0) { // This is Course 1
                newStudentsThisPeriod = studentsInNewLevel;
                totalStudentsInCourse1 += newStudentsThisPeriod;
            }

            const percentage = newLevel <= settings.payoutLevels ? (effectivePercentages[newLevel - 1] || 0) : 0;
            const commissionFromNewLevel = studentsInNewLevel * ((courses[i].price * percentage) / 100);

            periodEarnings[courses[i].name] = commissionFromNewLevel;
            totalPeriodEarnings += commissionFromNewLevel;

            // Allocate earnings
            const isFinalCourse = i === courses.length - 1;
            const nextCourseUnlocked = isFinalCourse || unlockedCourseStatus[i + 1];

            if (!isFinalCourse && !nextCourseUnlocked) {
                const toReserve = commissionFromNewLevel * reserveRatio;
                const toWallet = commissionFromNewLevel * (1 - reserveRatio);
                targetSavings[i] += toReserve;
                cumulativeWallet += toWallet;
            } else {
                cumulativeWallet += commissionFromNewLevel;
            }
        }

        // Check for graduations for the *next* period
        for (let i = 0; i < courses.length - 1; i++) {
            if (unlockedCourseStatus[i] && !unlockedCourseStatus[i+1]) {
                if (targetSavings[i] >= courses[i+1].price) {
                    unlockedCourseStatus[i+1] = true;
                }
            }
        }
        
        series.push({
            period,
            courseEarnings: periodEarnings,
            totalPeriodEarnings,
            cumulativeWallet,
            unlockedCourses: courses.filter((_, i) => unlockedCourseStatus[i]).map(c => c.name),
            newStudents: newStudentsThisPeriod,
            totalStudents: totalStudentsInCourse1,
        });
    }

    return series;
  }, [courses, settings, effectivePercentages]);

    const totalPercentage = effectivePercentages.reduce((sum, p) => sum + p, 0);
  const percentageWarning = totalPercentage > 100;

  const updateCoursePrice = (index: number, newPrice: number) => {
    const updatedCourses = [...courses];
    updatedCourses[index] = { ...updatedCourses[index], price: newPrice };
    setCourses(updatedCourses);
  };

  const addCourse = () => {
    const newCourseNumber = courses.length + 1;
    const lastPrice = courses[courses.length - 1].price;
    const newPrice = lastPrice * 2; // Default to double the previous price
    
    setCourses(prev => [...prev, {
      name: `Course ${newCourseNumber}`,
      price: newPrice
    }]);
  };

  const removeCourse = (index: number) => {
    if (courses.length > 2) { // Keep at least 2 courses
      setCourses(prev => prev.filter((_, i) => i !== index));
      if (activeTab >= courses.length - 1) {
        setActiveTab(courses.length - 2);
      }
    }
  };

  const renderNetworkVisualization = (courseIndex: number) => {
    const fullNetworkData = progressionStates[courseIndex];
    const displayDepth = cascadeVisualizationDepths[courseIndex];
    const truncatedLevels = fullNetworkData.levels.slice(0, displayDepth);
    const visData = {
      ...fullNetworkData,
      levels: truncatedLevels,
    };
    
    if (visData.isFinal) {
      return (
        <div className="bg-gray-900 p-2 rounded-lg font-mono text-xs">
          <div className="text-green-400 mb-1 text-xs">
            Final Course
          </div>
          <div className="text-cyan-400 text-xs mb-1">
            No target needed
          </div>
          
          {visData.levels.map((level, index) => {
            const levelColor = level.isPaidLevel ? "text-yellow-400" : "text-gray-500";
            
            return (
              <div key={index} className="flex items-center gap-1 text-xs">
                <span className={`${levelColor} w-12`}>L{level.level} {level.percentage}%</span>
                <span className="text-gray-400">|</span>
                <span className="text-green-400">
                  {level.students.toLocaleString()}
                </span>
              </div>
            );
          })}
          
          <div className="mt-1 text-cyan-400 text-xs border-t border-gray-700 pt-1">
            <div>Earnings: ${visData.levels.filter(l => l.isPaidLevel).reduce((sum, l) => sum + l.levelEarnings, 0).toFixed(0)}</div>
            <div>Sponsors: {visData.activeSponsorCount}</div>
          </div>
        </div>
      );
    }

    if (visData.activeSponsorCount === 0) {
      return (
        <div className="bg-gray-900 p-2 rounded-lg font-mono text-xs">
          <div className="text-green-400 mb-1 text-xs">
            Target: ${visData.targetPrice ? visData.targetPrice.toLocaleString() : 'N/A'}
          </div>
          <div className="text-gray-400 text-xs">
            No sponsors yet
          </div>
          <div className="mt-1 text-cyan-400 text-xs border-t border-gray-700 pt-1">
            <div>Sponsors: 0</div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-900 p-2 rounded-lg font-mono text-xs">
        <div className="text-green-400 mb-1 text-xs">
          Target: ${fullNetworkData.targetPrice ? fullNetworkData.targetPrice.toLocaleString() : 'N/A'}
        </div>
        
        {visData.levels.map((level, index) => {
          const isTargetLevel = level.level === fullNetworkData.targetLevel;
          const beforeTarget = level.level < fullNetworkData.targetLevel || fullNetworkData.targetLevel === -1;
          const levelColor = level.isPaidLevel ? "text-yellow-400" : "text-gray-500";
          
          if (isTargetLevel && fullNetworkData.studentsAtTargetLevel > 0 && fullNetworkData.studentsAtTargetLevel < level.students) {
            return (
              <div key={index} className="flex items-center gap-1 text-xs">
                <span className={`${levelColor} w-12`}>L{level.level} {level.percentage}%</span>
                <span className="text-gray-400">|</span>
                <span className="text-red-400">{fullNetworkData.studentsAtTargetLevel.toLocaleString()}</span>
                <Target className="w-2 h-2 text-yellow-400" />
                <span className="text-green-400">{(level.students - fullNetworkData.studentsAtTargetLevel).toLocaleString()}</span>
              </div>
            );
          }
          
          return (
            <div key={index} className="flex items-center gap-1 text-xs">
              <span className={`${levelColor} w-12`}>L{level.level} {level.percentage}%</span>
              <span className="text-gray-400">|</span>
              <span className={beforeTarget ? "text-red-400" : "text-green-400"}>
                {level.students.toLocaleString()}
              </span>
            </div>
          );
        })}
        
        <div className="mt-1 text-cyan-400 text-xs border-t border-gray-700 pt-1">
          <div>Target: {fullNetworkData.studentsNeededForTarget || 0}</div>
          <div>Sponsors: {fullNetworkData.activeSponsorCount}</div>
        </div>
      </div>
    );
  };

  const renderCourseDetails = (courseIndex: number) => {
    const networkData = progressionStates[courseIndex];
    
    if (networkData.isFinal) {
      const totalEarnings = networkData.levels
        .filter(l => l.isPaidLevel)
        .reduce((sum, l) => sum + l.levelEarnings, 0);

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-50 p-2 rounded-lg">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <Users className="w-3 h-3" />
                <span className="text-xs font-medium">Total Network Size</span>
              </div>
              <div className="text-lg font-bold text-gray-800">
                {networkData.totalNetworkSize.toLocaleString()}
              </div>
            </div>
            <div className="bg-green-50 p-2 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs font-medium">Total Potential Earnings</span>
              </div>
              <div className="text-lg font-bold text-green-800">
                ${totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Earnings by Level (Final Course)</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {networkData.levels.filter(level => level.isPaidLevel).map((level, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>
                    Level {level.level} ({level.students.toLocaleString()} students @ {level.percentage}%)
                  </span>
                  <span className={`font-medium ${level.isPaidLevel ? 'text-black' : 'text-gray-400'}`}>
                    ${level.levelEarnings.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (networkData.activeSponsorCount === 0) {
      return (
        <div className="space-y-4">
          <div className="text-center text-gray-600 p-8">
            No active sponsors at this course level yet.
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Users className="w-3 h-3" />
              <span className="text-xs font-medium">Target Students</span>
            </div>
            <div className="text-lg font-bold text-blue-800">
              {networkData.studentsNeededForTarget || 0}
            </div>
          </div>
          
          <div className="bg-gray-50 p-2 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Users className="w-3 h-3" />
              <span className="text-xs font-medium">Active Sponsors</span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {networkData.activeSponsorCount}
            </div>
          </div>
          
          <div className="bg-green-50 p-2 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign className="w-3 h-3" />
              <span className="text-xs font-medium">Wallet Earnings</span>
            </div>
            <div className="text-lg font-bold text-green-800">
              ${networkData.walletEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div className="bg-purple-50 p-2 rounded-lg">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Target className="w-3 h-3" />
              <span className="text-xs font-medium">Target</span>
            </div>
            <div className="text-lg font-bold text-purple-800">
              ${networkData.targetPrice ? networkData.targetPrice.toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">Earnings by Level</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {networkData.levels.filter(level => level.isPaidLevel).map((level, index) => {
              const isTargetLevel = level.level === networkData.targetLevel;
              
              return (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span>
                    Level {level.level} ({level.students.toLocaleString()} students @ {level.percentage}%)
                    {isTargetLevel && networkData.studentsAtTargetLevel && ` - Target reached at ${networkData.studentsAtTargetLevel} students`}
                  </span>
                  <span className="font-medium">${level.levelEarnings.toFixed(2)}</span>
                </div>
              );
            })}
            {networkData.targetLevel > 0 && (
              <div className="mt-2 pt-2 border-t text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total earnings at target:</span>
                  <span>${networkData.targetPrice ? networkData.targetPrice.toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTimeSimulation = () => {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-lg">Time Series Projection</h4>
          <button
            onClick={() => setShowTimeSettingsModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Configure Simulation</span>
          </button>
        </div>
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{settings.periodName}</th>
                {courses.map(course => (
                  <th key={course.name} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{course.name} Earnings</th>
                ))}
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total {settings.periodName} Earnings</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cumulative Wallet</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeSeriesData.map(data => (
                <tr key={data.period} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{data.period}</td>
                  {courses.map(course => (
                    <td key={course.name} className={`px-4 py-3 whitespace-nowrap text-sm ${data.courseEarnings[course.name] > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      ${data.courseEarnings[course.name].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-blue-600">
                    ${data.totalPeriodEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                    <div>
                      ${data.cumulativeWallet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs font-normal text-gray-500">
                      Growth: +{data.newStudents.toLocaleString()} | Total: {data.totalStudents.toLocaleString()}
                    </div>
                    {data.unlockedCourses.length > 0 && (
                      <div className="text-xs font-normal text-purple-600 mt-1">
                        <span>Unlocked Course: </span>
                        {courses.map((course, index) => {
                          const isUnlocked = data.unlockedCourses.includes(course.name);
                          return (
                            <span key={course.name} className={`ml-1.5 ${isUnlocked ? 'text-purple-600' : 'text-gray-400'}`}>
                              {isUnlocked ? '☑' : '☐'} {index + 1}{index < courses.length - 1 ? ',' : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTimeSettingsModal = () => {
    if (!showTimeSettingsModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-gray-800">Time Simulation Settings</h3>
            <button onClick={() => setShowTimeSettingsModal(false)} className="text-gray-400 hover:text-gray-800 text-2xl leading-none">
              &times;
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Time Period Name</label>
              <select
                value={settings.periodName}
                onChange={(e) => setSettings(prev => ({...prev, periodName: e.target.value}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {['Hour', 'Day', 'Week', 'Month', 'Year'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">The unit of time for each step in the simulation (e.g., Week).</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Number of Periods to Simulate</label>
              <input
                type="number"
                value={settings.numberOfPeriods}
                onChange={(e) => setSettings(prev => ({...prev, numberOfPeriods: parseInt(e.target.value) || 20}))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm shadow-sm focus:ring-blue-500 focus:border-blue-500"
                min="1" max="100"
              />
              <p className="text-xs text-gray-500 mt-1">How many {settings.periodName.toLowerCase()}s to project forward.</p>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setShowTimeSettingsModal(false)}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white">
      {renderTimeSettingsModal()}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Education Platform Network Calculator</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {showSettings && (
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold mb-4">Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Course Prices:</h4>
                <button
                  onClick={addCourse}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  Add Course
                </button>
              </div>
              <div className="space-y-2">
                {courses.map((course, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label className="w-20 text-sm">{course.name}:</label>
                    <input
                      type="number"
                      value={course.price}
                      onChange={(e) => updateCoursePrice(index, parseInt(e.target.value) || 0)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="1"
                    />
                    {courses.length > 2 && (
                      <button
                        onClick={() => removeCourse(index)}
                        className="text-xs text-red-500 hover:text-red-700 px-1 transition-colors"
                        title="Remove course"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Network Multiplier:</label>
                <input
                  type="number"
                  value={settings.multiplier}
                  onChange={(e) => setSettings(prev => ({...prev, multiplier: parseInt(e.target.value) || 3}))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="2"
                  max="10"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Payout Levels:</label>
                <input
                  type="number"
                  value={settings.payoutLevels}
                  onChange={(e) => setSettings(prev => ({...prev, payoutLevels: parseInt(e.target.value) || 6}))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  min="1"
                  max="20"
                />
                <p className="text-xs text-gray-500">How many levels receive commissions</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="reserve" className="block text-sm font-medium mb-1">
                  Target Reserve Percentage: {settings.reservePercentage}%
                </label>
                <input
                  id="reserve"
                  type="range"
                  value={settings.reservePercentage}
                  onChange={(e) => setSettings(prev => ({...prev, reservePercentage: parseInt(e.target.value)}))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  min="0"
                  max="100"
                  step="5"
                />
                <p className="text-xs text-gray-500">
                  % of pre-target earnings held to fund the next course.
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Commission Percentages:</h4>
                
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="uniform"
                    checked={settings.useUniformPercentage}
                    onChange={(e) => setSettings(prev => ({...prev, useUniformPercentage: e.target.checked, percentages: new Array(prev.payoutLevels).fill(prev.uniformPercentage)}))}
                    className="rounded"
                  />
                  <label htmlFor="uniform" className="text-sm">Uniform %</label>
                  {settings.useUniformPercentage && (
                    <input
                      type="number"
                      value={settings.uniformPercentage}
                      onChange={(e) => setSettings(prev => ({...prev, uniformPercentage: parseInt(e.target.value) || 15, percentages: new Array(prev.payoutLevels).fill(parseInt(e.target.value) || 15)}))}
                      className="w-12 px-1 py-1 border rounded text-xs"
                      min="0"
                      max={Math.floor(100 / settings.payoutLevels)}
                    />
                  )}
                  {settings.useUniformPercentage && (
                    <span className="text-xs text-gray-500">
                      (Max: {Math.floor(100 / settings.payoutLevels)}% for {settings.payoutLevels} levels)
                    </span>
                  )}
                </div>

                {!settings.useUniformPercentage && (
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {settings.percentages.slice(0, settings.payoutLevels).map((percent, index) => (
                      <div key={index} className="flex items-center gap-1">
                        <label className="w-6">L{String(index + 1).padStart(2, '0')}</label>
                        <input
                          type="number"
                          value={percent}
                          onChange={(e) => {
                            const newPercentages = [...settings.percentages];
                            newPercentages[index] = parseInt(e.target.value) || 0;
                            setSettings(prev => ({...prev, percentages: newPercentages}));
                          }}
                          className="w-12 px-1 py-1 border rounded text-xs"
                          min="0"
                          max="50"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2">
                  {percentageWarning && !settings.useUniformPercentage ? (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-2 py-1 rounded text-xs">
                      Total: {totalPercentage}% (exceeds 100%) - Only first {settings.payoutLevels} levels get paid
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 text-blue-600 px-2 py-1 rounded text-xs">
                      Total: {totalPercentage}% (Available: {100 - totalPercentage}%) - {settings.payoutLevels} payout levels
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {progressionStates.map((state, index) => (
          <div key={index} className="min-w-48 flex-shrink-0">
            <h3 className="text-sm font-semibold mb-1">{state.course.name} (${state.course.price})</h3>
            <div className="text-xs text-gray-600 mb-1">
              Target: {state.targetPrice ? `$${state.targetPrice}` : 'Final Course'}
            </div>
            {renderNetworkVisualization(index)}
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-lg">
        <div className="border-b">
          <div className="flex flex-wrap -mb-px">
            {courses.map((course, index) => (
              <button
                key={index}
                onClick={() => setActiveTab(index)}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === index
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {course.name}
              </button>
            ))}
            <button
              onClick={() => setActiveTab(courses.length)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === courses.length
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              Time Simulation
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {activeTab < courses.length ? renderCourseDetails(activeTab) : renderTimeSimulation()}
        </div>
      </div>

      <div className="mt-8 p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
        <h2 className="text-2xl font-bold text-indigo-800 mb-4">Full Cascade Snapshot</h2>
        <p className="text-sm text-indigo-700 mb-4">
          This table models the theoretical size of the <strong className="font-semibold">Course 1 network</strong> required for the original sponsor's entire downline to also progress through all courses, culminating in a full payout for the sponsor in the final course.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium text-gray-600">Total Required Depth in Course 1</p>
                <p className="text-3xl font-bold text-indigo-800">
                    {endStateSnapshot.totalRequiredDepth} Levels
                </p>
                <p className="text-xs text-gray-500">The sum of depths required for each step.</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm font-medium text-gray-600">Total Students in Course 1 Network</p>
                <p className="text-3xl font-bold text-indigo-800">
                    {endStateSnapshot.totalNetworkSize.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">The total unique individuals required.</p>
            </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <h4 className="font-semibold text-indigo-800 mb-2">Depth Calculation Breakdown:</h4>
          <table className="min-w-full divide-y divide-indigo-200">
              <thead className="bg-indigo-100">
                  <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-800 uppercase tracking-wider">Progression Step</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-indigo-800 uppercase tracking-wider">Required Depth Added</th>
                  </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                  {endStateSnapshot.depthDetails.map((state, index) => (
                      <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{state.trigger}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{state.requiredDepth} levels</td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
        <p><strong>How to read the network visualization:</strong></p>
        <div className="mt-2 space-y-1">
          <p>• <strong>Sponsor (Level 0)</strong>: The original student who starts the network</p>
          <p>• <strong>Level 1</strong>: The sponsor's direct recruits ({settings.multiplier} students)</p>
          <p>• <strong>Level 2</strong>: Each Level 1 student recruits {settings.multiplier} more ({Math.pow(settings.multiplier, 2)} total students)</p>
          <p>• <span className="text-red-400">Red numbers</span>: Students needed before target is reached</p>
          <p>• <span className="text-yellow-400">Target icon</span>: Point where target amount is achieved</p>
          <p>• <span className="text-green-400">Green numbers</span>: Additional students contributing to wallet earnings</p>
        </div>
      </div>
    </div>
  );
};

export default EducationNetworkCalculator;
