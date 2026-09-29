import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIProcessingOverlay } from '../../components/ui/AIProcessingOverlay';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoFtModal } from '../../components/ui/NoFtModal';
import { PhotoPreview } from '../../components/ui/PhotoPreview';
import { Screen } from '../../components/ui/Screen';
import { TextField } from '../../components/ui/TextField';
import { authErrorMessage, useAuth } from '../../context/auth-context';
import { useFt } from '../../context/ft-context';
import { ApiError, resolvePhotoUrl } from '../../lib/api';
import { normalizeCameraOrientation } from '../../lib/image';
import { CATEGORY_OPTIONS, categoryLabel, type ItemCategory } from '../../lib/item-enums';
import { identifyItemPhotos, uploadItemPhotos } from '../../lib/items';
import { useAiProcessing } from '../../lib/use-ai-processing';
import { createWishlistItem, deleteWishlistItem, fetchWishlist, updateWishlistItem, type WishlistItem } from '../../lib/wishlist';
import { colors } from '../../theme/tokens';

const AUTOFILL_STEPS = ['Analizando el objeto...', 'Extrayendo los datos...', 'Puliendo resultados...'];

function priceLabel(item: WishlistItem): string | null {
  if (item.price === null) return null;
  const amount = Number(item.price);
  if (Number.isNaN(amount)) return null;
  return `$${amount.toLocaleString('es-MX', { maximumFractionDigits: 2 })} ${item.currency}`;
}

function WishlistCard({ item, onEdit }: { item: WishlistItem; onEdit: () => void }) {
  const photo = item.photoUrl ? resolvePhotoUrl(item.photoUrl) : undefined;
  const price = priceLabel(item);
  return (
    <Pressable onPress={onEdit} className="mb-3 flex-row overflow-hidden rounded-xl bg-surface">
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: 88, height: 88 }} resizeMode="cover" />
      ) : (
        <View style={{ width: 88, height: 88 }} className="items-center justify-center bg-surfaceElevated">
          <Ionicons name="heart-outline" size={24} color={colors.textMuted} />
        </View>
      )}
      <View className="flex-1 justify-center px-3 py-2">
        <Text className="font-body-bold text-base text-text" numberOfLines={2}>
          {item.name}
        </Text>
        {item.category ? <Text className="mt-0.5 text-xs text-textMuted">{categoryLabel(item.category)}</Text> : null}
        {item.foundAt ? (
          <Text className="mt-0.5 text-xs text-textSecondary" numberOfLines={1}>
            📍 {item.foundAt}
          </Text>
        ) : null}
        {price ? <Text className="mt-0.5 text-sm text-primary">{price}</Text> : null}
      </View>
      <View className="justify-center pr-3">
        <Ionicons name="create-outline" size={18} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

interface EditModalProps {
  item: WishlistItem | null;
  onClose: () => void;
  onSaved: (item: WishlistItem) => void;
  onDeleted: (id: string) => void;
}

// Plan §5.4.3: de la wishlist solo se editan "dónde lo viste", precio y notas.
function EditModal({ item, onClose, onSaved, onDeleted }: EditModalProps) {
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [foundAt, setFoundAt] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  // Rellena el formulario al abrir otro elemento.
  if (item && item.id !== loadedId) {
    setLoadedId(item.id);
    setFoundAt(item.foundAt ?? '');
    setPrice(item.price !== null ? String(Number(item.price)) : '');
    setNotes(item.notes ?? '');
    setError(null);
  }

  const onSave = async () => {
    if (!accessToken || !item) return;
    const trimmedPrice = price.trim().replace(',', '.');
    const amount = trimmedPrice === '' ? undefined : Number(trimmedPrice);
    if (amount !== undefined && (Number.isNaN(amount) || amount < 0)) {
      setError('El precio debe ser un número válido.');
      return;
    }
    setBusy('save');
    setError(null);
    try {
      const updated = await updateWishlistItem(accessToken, item.id, {
        foundAt: foundAt.trim() || undefined,
        price: amount,
        notes: notes.trim() || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const onDelete = () => {
    if (!accessToken || !item) return;
    Alert.alert('Quitar de la wishlist', `¿Quitar "${item.name}" de tu wishlist?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          setBusy('delete');
          setError(null);
          try {
            await deleteWishlistItem(accessToken, item.id);
            onDeleted(item.id);
          } catch (err) {
            setError(authErrorMessage(err));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={item !== null} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="rounded-t-2xl bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-body-bold flex-1 pr-3 text-lg text-text" numberOfLines={1}>
              {item?.name}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
            <TextField label="¿Dónde lo viste?" value={foundAt} onChangeText={setFoundAt} placeholder="Tienda, ciudad o enlace" autoCapitalize="sentences" />
            <TextField label="Precio" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
            <TextField label="Notas" value={notes} onChangeText={setNotes} placeholder="Opcional" autoCapitalize="sentences" multiline />
          </ScrollView>
          {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}
          <View className="gap-3">
            <Button label="Guardar" onPress={onSave} loading={busy === 'save'} disabled={busy === 'delete'} />
            <Button label="Quitar de la wishlist" variant="destructive" onPress={onDelete} loading={busy === 'delete'} disabled={busy === 'save'} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Carga manual: agregar un objeto a la wishlist a mano, sin pasar por "¿Ya lo
// tengo?". Opcionalmente se le puede tomar una foto (botón de cámara debajo
// del título): con ella, "Autollenar datos" reusa el mismo reconocimiento por
// IA que "¿Ya lo tengo?" (mismo costo en FT) para prellenar nombre/categoría;
// "Llenado manual" solo adjunta la foto y deja el resto para llenar a mano.
function AddModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (item: WishlistItem) => void;
}) {
  const { accessToken } = useAuth();
  const { costOf, refresh: refreshFt } = useFt();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const [step, setStep] = useState<'form' | 'camera' | 'preview'>('form');
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [foundAt, setFoundAt] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'save' | 'autofill' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noFtVisible, setNoFtVisible] = useState(false);
  const searching = useAiProcessing();

  // Si se quitó la única foto desde el preview, no queda nada que previsualizar.
  if (step === 'preview' && photos.length === 0) {
    setStep('form');
  }

  const reset = () => {
    setStep('form');
    setPhotos([]);
    setName('');
    setCategory(null);
    setFoundAt('');
    setPrice('');
    setNotes('');
    setError(null);
  };

  const closeModal = () => {
    reset();
    onClose();
  };

  const onCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    setError(null);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      const uri = await normalizeCameraOrientation(picture.uri);
      setPhotos([uri]);
      setStep('preview');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  const onPickFromGallery = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (picked.canceled) return;
    setPhotos([picked.assets[0].uri]);
    setStep('preview');
  };

  const onAutofill = async () => {
    if (!accessToken || photos.length === 0) return;
    setBusy('autofill');
    setError(null);
    try {
      const result = await searching.run(() => identifyItemPhotos(accessToken, photos));
      refreshFt();
      setName(result.extracted.name?.trim() ?? '');
      setCategory(result.extracted.category ?? null);
      setStep('form');
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setNoFtVisible(true);
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  };

  const onSave = async () => {
    if (!accessToken || name.trim().length === 0) return;
    const trimmedPrice = price.trim().replace(',', '.');
    const amount = trimmedPrice === '' ? undefined : Number(trimmedPrice);
    if (amount !== undefined && (Number.isNaN(amount) || amount < 0)) {
      setError('El precio debe ser un número válido.');
      return;
    }
    setBusy('save');
    setError(null);
    try {
      let photoUrl: string | undefined;
      if (photos.length > 0) {
        [photoUrl] = await uploadItemPhotos(accessToken, photos);
      }
      const created = await createWishlistItem(accessToken, {
        name: name.trim(),
        category: category ?? undefined,
        photoUrl,
        foundAt: foundAt.trim() || undefined,
        price: amount,
        notes: notes.trim() || undefined,
      });
      onCreated(created);
      reset();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  let content: ReactNode;

  if (step === 'camera') {
    if (!permission) {
      content = <View className="flex-1 bg-backgroundDeep" />;
    } else if (!permission.granted) {
      content = (
        <View className="flex-1 items-center justify-center bg-backgroundDeep px-8">
          <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
          <Text className="mb-6 mt-4 text-center text-base text-textSecondary">
            Frikidex necesita la cámara para tomarle una foto a este objeto.
          </Text>
          <View className="w-full gap-3">
            <Button label="Permitir cámara" onPress={requestPermission} />
            <Button label="Cancelar" variant="ghost" onPress={() => setStep('form')} />
          </View>
        </View>
      );
    } else {
      content = (
        <View className="flex-1 bg-backgroundDeep">
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} />
          <Pressable
            onPress={() => setStep('form')}
            className="absolute h-10 w-10 items-center justify-center rounded-full bg-background/70"
            style={{ top: insets.top + 12, left: 16 }}
          >
            <Ionicons name="close" size={22} color={colors.white} />
          </Pressable>
          <View pointerEvents="none" className="absolute inset-x-0 items-center" style={{ top: insets.top + 64 }}>
            <Text className="rounded-full bg-background/70 px-4 py-2 text-sm text-white">
              Encuadra el objeto y toma la foto
            </Text>
          </View>
          <View className="absolute inset-x-0 bottom-0 items-center" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="w-full flex-row items-center justify-around px-8">
              <Pressable onPress={onPickFromGallery} className="h-12 w-12 items-center justify-center rounded-full bg-background/70">
                <Ionicons name="images-outline" size={24} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={onCapture}
                disabled={!cameraReady}
                className="h-20 w-20 items-center justify-center rounded-full border-4 border-white"
              >
                <View className="h-14 w-14 rounded-full bg-primary" />
              </Pressable>
              <View className="h-12 w-12" />
            </View>
            {error ? <Text className="mt-4 text-sm text-danger">{error}</Text> : null}
          </View>
        </View>
      );
    }
  } else if (step === 'preview') {
    content = (
      <View className="flex-1 bg-backgroundDeep" style={{ paddingTop: insets.top + 24 }}>
        <View className="flex-1 px-5">
          <PhotoPreview photos={photos} setPhotos={setPhotos} disabled={busy !== null} />
        </View>
        <View className="gap-3 px-5" style={{ paddingBottom: insets.bottom + 20, paddingTop: 16 }}>
          {error ? <Text className="text-center text-sm text-danger">{error}</Text> : null}
          <Button label="Autollenar datos" ftCost={costOf('SCAN_HAVE_IT')} onPress={onAutofill} loading={busy === 'autofill'} />
          <Button label="Llenado manual" variant="secondary" onPress={() => setStep('form')} disabled={busy !== null} />
        </View>
        <AIProcessingOverlay visible={searching.visible} done={searching.done} onHidden={searching.onHidden} steps={AUTOFILL_STEPS} />
        <NoFtModal visible={noFtVisible} onClose={() => setNoFtVisible(false)} />
      </View>
    );
  } else {
    content = (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={closeModal} />
        <View className="rounded-t-2xl bg-surface px-5 pt-5" style={{ paddingBottom: insets.bottom + 20 }}>
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-body-bold flex-1 pr-3 text-lg text-text">Agregar a wishlist</Text>
            <Pressable onPress={closeModal} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>

          {photos.length > 0 ? (
            <View className="mb-4 flex-row items-center gap-3">
              <Image source={{ uri: photos[0] }} style={{ width: 56, height: 56, borderRadius: 10 }} />
              <Pressable onPress={() => setStep('preview')} className="flex-row items-center gap-1.5">
                <Ionicons name="camera-outline" size={16} color={colors.textSecondary} />
                <Text className="text-sm text-textSecondary">Cambiar foto</Text>
              </Pressable>
              <Pressable onPress={() => setPhotos([])} hitSlop={8} className="ml-auto">
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setStep('camera')}
              className="mb-4 flex-row items-center gap-2 self-start rounded-full border border-border bg-surfaceElevated px-3 py-2"
            >
              <Ionicons name="camera-outline" size={18} color={colors.textSecondary} />
              <Text className="text-sm text-textSecondary">Agregar foto (opcional)</Text>
            </Pressable>
          )}

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
            <TextField
              label="Nombre"
              value={name}
              onChangeText={setName}
              placeholder="¿Qué quieres agregar?"
              autoCapitalize="sentences"
            />
            <Text className="mb-1.5 text-sm font-medium text-textSecondary">Categoría</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setCategory((prev) => (prev === option.value ? null : option.value))}
                  className={`rounded-full border px-3 py-2 ${
                    category === option.value ? 'border-primary bg-surfaceElevated' : 'border-border bg-surfaceElevated'
                  }`}
                >
                  <Text className={`text-sm ${category === option.value ? 'text-primary' : 'text-textMuted'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextField
              label="¿Dónde lo viste?"
              value={foundAt}
              onChangeText={setFoundAt}
              placeholder="Tienda, ciudad o enlace"
              autoCapitalize="sentences"
            />
            <TextField label="Precio" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
            <TextField label="Notas" value={notes} onChangeText={setNotes} placeholder="Opcional" autoCapitalize="sentences" multiline />
          </ScrollView>
          {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}
          <Button label="Agregar" onPress={onSave} loading={busy === 'save'} disabled={name.trim().length === 0} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeModal}>
      {content}
    </Modal>
  );
}

export default function WishlistScreen() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!accessToken) return () => {};
    let active = true;
    fetchWishlist(accessToken)
      .then((loaded) => {
        if (!active) return;
        setItems(loaded);
        setError(null);
      })
      .catch((err) => {
        if (active) setError(authErrorMessage(err));
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => load(), [load]),
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="font-display text-[22px] uppercase tracking-wide text-text">Wishlist</Text>
          <Pressable
            onPress={() => router.push('/ya-lo-tengo')}
            className="flex-row items-center rounded-full bg-secondary px-3.5 py-2"
          >
            <Ionicons name="camera" size={16} color={colors.white} />
            <Text className="ml-1.5 text-sm text-white">¿Ya lo tengo?</Text>
          </Pressable>
        </View>

        {error && items === null ? (
          <View className="mt-8 items-center gap-4">
            <Text className="text-center text-sm text-danger">{error}</Text>
            <Button label="Reintentar" onPress={load} />
          </View>
        ) : items === null ? (
          <ActivityIndicator className="mt-12" color={colors.primary} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="heart-outline"
            title="Tu wishlist está vacía"
            description="Cuando “¿Ya lo tengo?” detecte algo que no tienes, podrás mandarlo aquí en un toque, o agrégalo tú mismo con el botón +."
          />
        ) : (
          items.map((item) => <WishlistCard key={item.id} item={item} onEdit={() => setEditing(item)} />)
        )}

        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) => prev?.map((entry) => (entry.id === updated.id ? updated : entry)) ?? prev);
            setEditing(null);
          }}
          onDeleted={(id) => {
            setItems((prev) => prev?.filter((entry) => entry.id !== id) ?? prev);
            setEditing(null);
          }}
        />

        <AddModal
          visible={adding}
          onClose={() => setAdding(false)}
          onCreated={(created) => {
            setItems((prev) => (prev ? [created, ...prev] : [created]));
            setAdding(false);
          }}
        />
      </Screen>

      <Pressable
        onPress={() => setAdding(true)}
        className="absolute h-16 w-16 items-center justify-center rounded-full shadow-lg"
        style={{ right: 20, bottom: insets.bottom + 96, backgroundColor: colors.wishlist }}
      >
        <Ionicons name="heart" size={28} color={colors.white} />
      </Pressable>
    </View>
  );
}
