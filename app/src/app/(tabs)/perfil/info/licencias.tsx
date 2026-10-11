import { Linking, Pressable, Text, View } from 'react-native';
import { Screen } from '../../../../components/ui/Screen';
import licenses from '../../../../../assets/licenses.json';
import { colors } from '../../../../theme/tokens';

type LicenseEntry = { name: string; version: string; license: string; repository: string | null };

export default function LicenciasScreen() {
  const entries = licenses as LicenseEntry[];

  return (
    <Screen>
      <Text className="mb-4 text-sm text-textMuted">
        Frikidex se construyó usando las siguientes librerías de código abierto. Se muestra su licencia y, cuando está
        disponible, el repositorio del proyecto.
      </Text>
      <View className="rounded-lg border border-border bg-surface px-4">
        {entries.map((entry, index) => {
          const content = (
            <View className={`py-3 ${index < entries.length - 1 ? 'border-b border-border' : ''}`}>
              <Text className="text-sm font-body-bold text-text">
                {entry.name} <Text className="text-textMuted">v{entry.version}</Text>
              </Text>
              <Text className="text-xs text-textMuted">{entry.license}</Text>
            </View>
          );
          if (!entry.repository) return <View key={entry.name}>{content}</View>;
          return (
            <Pressable key={entry.name} onPress={() => Linking.openURL(entry.repository as string)}>
              {content}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
