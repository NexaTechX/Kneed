import { Alert, Pressable, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colors } from '@/constants/colors';

export function FloatingMapButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      style={styles.fab}
      onPress={onPress ?? (() => Alert.alert('Map', 'Map view coming soon.'))}
      accessibilityRole="button"
      accessibilityLabel="Open map">
      <FontAwesome name="map" size={22} color={colors.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
