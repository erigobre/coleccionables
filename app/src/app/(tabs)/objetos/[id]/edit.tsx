import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Button } from '../../../../components/ui/Button';
import { ItemFormFields } from '../../../../components/items/ItemFormFields';
import { PhotoManager } from '../../../../components/items/PhotoManager';
import { authErrorMessage, useAuth } from '../../../../context/auth-context';
import { EMPTY_ITEM_FORM, itemFormFromItem, itemFormIsValid, itemFormToUpdateDto, type ItemFormValues } from '../../../../lib/item-form';
import { fetchItem, updateItem, type ItemPhoto } from '../../../../lib/items';
import { colors } from '../../../../theme/tokens';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const router = useRouter();

  const [values, setValues] = useState<ItemFormValues>(EMPTY_ITEM_FORM);
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !id) return;
    fetchItem(accessToken, id)
      .then((item) => {
        setValues(itemFormFromItem(item));
        setPhotos(item.photos);
        setLoaded(true);
      })
      .catch((err) => setError(authErrorMessage(err)));
  }, [accessToken, id]);

  // Solo refresca las fotos: recargar todo el objeto pisaría lo ya tecleado en el formulario.
  const reloadPhotos = async () => {
    if (!accessToken || !id) return;
    const item = await fetchItem(accessToken, id);
    setPhotos(item.photos);
  };

  const onChange = <K extends keyof ItemFormValues>(field: K, value: ItemFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const onSave = async () => {
    if (!accessToken || !id || !itemFormIsValid(values)) return;
    setSaving(true);
    setError(null);
    try {
      await updateItem(accessToken, id, itemFormToUpdateDto(values));
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingTop: 16, paddingBottom: 120, paddingHorizontal: 20 }}
      keyboardShouldPersistTaps="handled"
    >
      {accessToken && id ? (
        <PhotoManager accessToken={accessToken} itemId={id} photos={photos} onChanged={reloadPhotos} />
      ) : null}

      <ItemFormFields values={values} onChange={onChange} />

      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <Button label="Guardar cambios" onPress={onSave} loading={saving} disabled={!itemFormIsValid(values)} />
    </ScrollView>
  );
}
