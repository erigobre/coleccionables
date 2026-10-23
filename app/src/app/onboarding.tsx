import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/ui/Button';
import { LogoHorizontal } from '../components/ui/LogoHorizontal';
import { authErrorMessage, useAuth } from '../context/auth-context';
import {
  completeOnboarding,
  fetchOnboardingOptions,
  type OnboardingOption,
  type OnboardingOptions,
  type ThemePreference,
} from '../lib/onboarding';
import { colors } from '../theme/tokens';

type Step = 'welcome' | 'collecting' | 'location' | 'theme';

const THEME_CHOICES: { value: ThemePreference; label: string; swatch: string }[] = [
  { value: 'MORADO', label: 'Morado', swatch: colors.secondary },
  { value: 'NEGRO', label: 'Negro', swatch: colors.backgroundDeep },
  { value: 'ROSA', label: 'Rosa', swatch: colors.wishlist },
];

function toggleInSet(set: Set<string>, code: string): Set<string> {
  const next = new Set(set);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  return next;
}

function OptionCard({
  option,
  selected,
  onPress,
}: {
  option: OnboardingOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ width: '31%' }}
      className={`mb-3 items-center justify-center rounded-2xl border px-2 py-4 ${
        selected ? 'border-primary bg-primary' : 'border-border bg-surfaceElevated'
      }`}
    >
      <Ionicons
        name={option.icon as keyof typeof Ionicons.glyphMap}
        size={26}
        color={selected ? colors.primaryText : colors.textMuted}
      />
      <Text
        numberOfLines={2}
        className={`mt-2 text-center text-xs ${selected ? 'text-primaryText font-body-bold' : 'text-textSecondary'}`}
      >
        {option.label}
      </Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('welcome');
  const [options, setOptions] = useState<OnboardingOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [collectingSelected, setCollectingSelected] = useState<Set<string>>(new Set());
  const [locationSelected, setLocationSelected] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<ThemePreference>('MORADO');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    fetchOnboardingOptions(accessToken)
      .then(setOptions)
      .catch((err) => setError(authErrorMessage(err)))
      .finally(() => setLoadingOptions(false));
  }, [accessToken]);

  const finish = async () => {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding(accessToken, {
        collectingCodes: Array.from(collectingSelected),
        locationCodes: Array.from(locationSelected),
        theme,
      });
      router.replace({ pathname: '/(tabs)', params: { onboarded: '1' } });
    } catch (err) {
      setError(authErrorMessage(err));
      setSubmitting(false);
    }
  };

  const onSkip = () => {
    finish();
  };

  const stepsOrder: Step[] = useMemo(() => ['welcome', 'collecting', 'location', 'theme'], []);
  const goBack = () => {
    const index = stepsOrder.indexOf(step);
    if (index > 0) setStep(stepsOrder[index - 1]);
  };

  if (step === 'welcome') {
    return (
      <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 24, paddingHorizontal: 20 }}>
        <View className="mb-8">
          <LogoHorizontal />
        </View>
        <Text className="font-display text-[26px] uppercase tracking-wide text-text">
          ¡Bienvenido, {user?.name ?? ''}!
        </Text>
        <Text className="mt-3 text-sm text-textMuted">
          Antes de empezar, cuéntanos un poco sobre tu colección. Esto nos ayuda a configurar tu app a tu medida — toma
          menos de un minuto.
        </Text>

        <View className="flex-1" />

        <View style={{ paddingBottom: insets.bottom + 24 }}>
          {error ? <Text className="mb-3 text-center text-sm text-danger">{error}</Text> : null}
          <Button label="Comenzar" onPress={() => setStep('collecting')} disabled={loadingOptions} />
          <Pressable onPress={onSkip} disabled={submitting} className="mt-4 items-center py-2">
            <Text className="text-sm text-textMuted underline">Omitir</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'theme') {
    return (
      <View className="flex-1 bg-background">
        <View
          className="flex-row items-center px-5"
          style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}
        >
          <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center">
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text className="mb-1 font-display text-2xl uppercase tracking-wide text-text">Elige un tema</Text>
          <Text className="mb-6 text-sm text-textMuted">Podrás cambiarlo después cuando quieras.</Text>

          <View className="flex-row justify-between">
            {THEME_CHOICES.map((choice) => {
              const selected = theme === choice.value;
              return (
                <Pressable
                  key={choice.value}
                  onPress={() => setTheme(choice.value)}
                  className="items-center"
                  style={{ width: '30%' }}
                >
                  <View
                    className={`h-20 w-20 rounded-full border-4 ${selected ? 'border-primary' : 'border-transparent'}`}
                    style={{ backgroundColor: choice.swatch }}
                  />
                  <Text
                    className={`mt-2 text-sm ${selected ? 'font-body-bold text-text' : 'text-textSecondary'}`}
                  >
                    {choice.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View className="px-5" style={{ paddingBottom: insets.bottom + 20, paddingTop: 12 }}>
          {error ? <Text className="mb-3 text-center text-sm text-danger">{error}</Text> : null}
          <Button label="¡Todo listo!" onPress={finish} loading={submitting} />
          <Pressable onPress={onSkip} disabled={submitting} className="mt-4 items-center py-2">
            <Text className="text-sm text-textMuted underline">Omitir</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 'collecting' | 'location'
  const isCollecting = step === 'collecting';
  const list = isCollecting ? options?.collecting ?? [] : options?.locations ?? [];
  const selected = isCollecting ? collectingSelected : locationSelected;
  const setSelected = isCollecting ? setCollectingSelected : setLocationSelected;
  const title = isCollecting ? '¿Qué te gusta coleccionar?' : '¿Dónde tienes tus colecciones?';

  const onContinue = () => {
    if (isCollecting) setStep('location');
    else setStep('theme');
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center px-5" style={{ paddingTop: insets.top + 16, paddingBottom: 12 }}>
        <Pressable onPress={goBack} className="h-10 w-10 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
      </View>

      {loadingOptions ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Text className="mb-1 font-display text-2xl uppercase tracking-wide text-text">{title}</Text>
          <Text className="mb-5 text-sm text-textMuted">Elige todas las que apliquen.</Text>

          <View className="flex-row flex-wrap justify-between">
            {list.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                selected={selected.has(option.code)}
                onPress={() => setSelected(toggleInSet(selected, option.code))}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <View className="px-5" style={{ paddingBottom: insets.bottom + 20, paddingTop: 12 }}>
        {error ? <Text className="mb-3 text-center text-sm text-danger">{error}</Text> : null}
        <Button label="Continuar" onPress={onContinue} disabled={selected.size === 0 || loadingOptions} />
        <Pressable onPress={onSkip} disabled={submitting} className="mt-4 items-center py-2">
          <Text className="text-sm text-textMuted underline">Omitir</Text>
        </Pressable>
      </View>
    </View>
  );
}
