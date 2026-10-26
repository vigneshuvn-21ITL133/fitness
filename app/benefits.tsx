import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing } from '@/theme';

/**
 * Educational content only. Nothing here promises to prevent or treat a
 * disease, and nothing replaces advice from a clinician.
 */
const CARDS: { title: string; points: string[] }[] = [
  {
    title: 'Being active',
    points: [
      'Regular physical activity supports general health and mood.',
      'Walking, cycling and other movement you enjoy all count, and any increase in activity can help.',
      'If you have a health condition or are starting something new, check with a clinician first.',
    ],
  },
  {
    title: 'A healthy weight',
    points: [
      'Tracking your weight over time helps you notice trends, not single-day changes.',
      'Day-to-day weight changes are often due to fluid and food and are normal.',
    ],
  },
  {
    title: 'About BMI',
    points: [
      'BMI is a simple screening measure based on height and weight.',
      'It does not measure body fat directly and can be misleading for athletes, older adults and some body types.',
      'For people under 18, BMI should be read against age- and sex-based charts by a clinician.',
    ],
  },
  {
    title: 'Blood pressure monitoring',
    points: [
      'Readings can vary through the day. Measure at a similar time, seated and rested, when possible.',
      'Keep a log and bring it to appointments. A single high reading is not a diagnosis.',
      'Get urgent medical help for chest pain, breathlessness, severe headache, weakness, confusion or vision changes.',
    ],
  },
  {
    title: 'Sleep',
    points: [
      'Most adults do best with 7 to 9 hours of sleep a night.',
      'A regular wake time and a calm routine before bed can make sleep more consistent.',
    ],
  },
  {
    title: 'Hydration and nutrition',
    points: [
      'Drink water through the day, and more when it is hot or you are active.',
      'Eating plenty of vegetables, fruit, whole grains and protein is a practical everyday pattern.',
    ],
  },
  {
    title: 'Building habits',
    points: [
      'Start small and make the habit easy to repeat, such as a short walk after a meal.',
      'Track progress in this app and celebrate consistency rather than perfection.',
    ],
  },
];

export default function BenefitsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Health Benefits" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.intro}>
          General information to support everyday habits. This is not medical advice.
        </Text>
        {CARDS.map((card) => (
          <Card key={card.title}>
            <Text style={styles.title}>{card.title}</Text>
            <View style={styles.points}>
              {card.points.map((point) => (
                <Text key={point} style={styles.point}>
                  • {point}
                </Text>
              ))}
            </View>
          </Card>
        ))}
        <Text style={styles.disclaimer}>
          Talk to a doctor, nurse or pharmacist before changing diet, exercise or medication, especially if you
          have a health condition.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg },
  intro: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  title: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: spacing.sm },
  points: { gap: spacing.sm },
  point: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  disclaimer: { color: colors.textFaint, fontSize: 11, lineHeight: 16 },
});
