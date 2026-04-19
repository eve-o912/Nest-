import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography, spacing } from '@/constants/theme';

interface ScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  showNull?: boolean;
}

export function ScoreRing({
  score,
  size = 60,
  strokeWidth = 6,
  showNull = true,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  const getColor = () => {
    if (score === null) return colors.muted;
    if (score >= 85) return colors.green;
    if (score >= 50) return colors.amber;
    return colors.red;
  };

  const getBackgroundColor = () => {
    if (score === null) return colors.bg4;
    if (score >= 85) return colors.greenDim;
    if (score >= 50) return colors.amberDim;
    return colors.redDim;
  };

  const progress = score !== null ? score / 100 : 0;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Background circle */}
        <Circle
          stroke={getBackgroundColor()}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <Circle
          stroke={getColor()}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.textContainer}>
        <Text style={[styles.score, { fontSize: size * 0.35, color: getColor() }]}>
          {score !== null ? score : showNull ? '-' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  score: {
    fontWeight: 'bold',
    fontFamily: typography.mono,
  },
});
