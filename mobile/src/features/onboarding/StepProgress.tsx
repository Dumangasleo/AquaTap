import { View } from 'react-native';
import { AppText } from '../../components/ui';
import { cn } from '../../utils/cn';

interface StepProgressProps {
  currentStep: number;
  stepTitles: string[];
}

/** "Step 2 of 3 · Your address" with a progress bar. */
export function StepProgress({ currentStep, stepTitles }: StepProgressProps) {
  const totalSteps = stepTitles.length;
  return (
    <View className="gap-2" accessibilityLabel={`Step ${currentStep} of ${totalSteps}: ${stepTitles[currentStep - 1]}`}>
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="overline" className="text-brand">
          Step {currentStep} of {totalSteps}
        </AppText>
        <AppText variant="label" className="text-ink-muted">
          {stepTitles[currentStep - 1]}
        </AppText>
      </View>
      <View className="flex-row gap-1.5">
        {stepTitles.map((title, index) => (
          <View key={title} className={cn('h-1.5 flex-1 rounded-full bg-line', index < currentStep && 'bg-brand')} />
        ))}
      </View>
    </View>
  );
}
