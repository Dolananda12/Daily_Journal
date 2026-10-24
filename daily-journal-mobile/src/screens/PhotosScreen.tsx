import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch, getApiBaseUrl } from '../lib/apiClient';
import { LightboxModal, GalleryImage } from '../components/LightboxModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 16 * 2 - 10) / 2;

export function PhotosScreen() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchImages = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({ limit: '60' });
      if (favoriteOnly) params.append('favorite', 'true');

      const res = await apiFetch(`/api/images?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setImages(data?.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch photos', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [favoriteOnly]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Upload Photo (supports Native via FileSystem.uploadAsync & Web via Blob)
  const uploadImageUri = async (uri: string, width?: number, height?: number) => {
    setUploading(true);
    try {
      const baseUrl = await getApiBaseUrl();
      const uploadUrl = `${baseUrl}/api/images/upload`;

      if (Platform.OS === 'web') {
        const filename = uri.split('/').pop() || 'photo.jpg';
        const blobRes = await fetch(uri);
        const blob = await blobRes.blob();

        const formData = new FormData();
        formData.append('file', blob, filename);
        if (width) formData.append('width', String(width));
        if (height) formData.append('height', String(height));

        const res = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
          },
        });

        if (res.ok) {
          fetchImages(true);
        } else {
          Alert.alert('Upload Failed', 'Server could not process image.');
        }
      } else {
        // Native (Android & iOS) via expo-file-system
        // Completely bypasses React Native FormDataPart / fetch issues
        const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          parameters: {
            ...(width ? { width: String(width) } : {}),
            ...(height ? { height: String(height) } : {}),
          },
          headers: {
            Accept: 'application/json',
          },
        });

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          fetchImages(true);
        } else {
          Alert.alert('Upload Failed', `Server responded with status ${uploadResult.status}.`);
        }
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Could not connect to backend.');
    } finally {
      setUploading(false);
    }
  };

  const handlePickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera roll permission is required to select photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadImageUri(asset.uri, asset.width, asset.height);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Camera permission is required to capture photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      uploadImageUri(asset.uri, asset.width, asset.height);
    }
  };

  const handleAddPhotoPress = () => {
    Alert.alert(
      'Add Journal Photo',
      'Choose a source',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleToggleFavorite = (id: string, isFav: boolean) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, favorite: isFav } : img))
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, !favoriteOnly && styles.filterChipActive]}
            onPress={() => setFavoriteOnly(false)}
          >
            <Text style={[styles.filterChipText, !favoriteOnly && styles.filterChipTextActive]}>
              All Photos ({images.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, favoriteOnly && styles.filterChipActive]}
            onPress={() => setFavoriteOnly(true)}
          >
            <Ionicons
              name="heart"
              size={13}
              color={favoriteOnly ? theme.colors.accentDark : theme.colors.textMuted}
            />
            <Text style={[styles.filterChipText, favoriteOnly && styles.filterChipTextActive]}>
              Favorites
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={handleAddPhotoPress}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="camera-outline" size={16} color="#fff" />
              <Text style={styles.uploadBtnText}>Add Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Uploading Banner */}
      {uploading && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator size="small" color={theme.colors.accentDark} />
          <Text style={styles.uploadingText}>Uploading photo to cloud storage...</Text>
        </View>
      )}

      {/* Grid */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={theme.colors.accentDark} />
        </View>
      ) : (
        <FlatList
          data={images}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchImages(true)} />
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.photoCard}
              activeOpacity={0.85}
              onPress={() => setLightboxIndex(index)}
            >
              <Image
                source={{ uri: item.thumbUrl || item.displayUrl }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              {item.favorite && (
                <View style={styles.favoriteBadge}>
                  <Ionicons name="heart" size={12} color="#E53E3E" />
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>🖼️</Text>
              <Text style={styles.emptyTitle}>
                {favoriteOnly ? 'No favorite photos yet' : 'No photos recorded yet'}
              </Text>
              <Text style={styles.emptySub}>
                Capture memories, study notes, or whiteboard sketches directly into your journal.
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={handleAddPhotoPress}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyAddBtnText}>Add your first photo</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <LightboxModal
          images={images}
          initialIndex={lightboxIndex}
          visible={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
          onDelete={handleDeleteImage}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accentFaint,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text2,
  },
  filterChipTextActive: {
    color: theme.colors.accentDark,
    fontWeight: '700',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.accentDark,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.accentFaint,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.accent,
  },
  uploadingText: {
    fontSize: 12,
    color: theme.colors.accentDark,
    fontWeight: '600',
  },
  gridContent: {
    padding: 16,
    paddingBottom: 40,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  photoCard: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 1.1,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    padding: 4,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentDark,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.md,
  },
  emptyAddBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
