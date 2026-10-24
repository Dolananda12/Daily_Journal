import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { apiFetch } from '../lib/apiClient';
import { formatDisplayDate } from '../lib/dateUtils';

export interface GalleryImage {
  id: string;
  thumbUrl: string;
  displayUrl: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  takenAt?: string;
  createdAt?: string;
  caption?: string;
  favorite?: boolean;
}

interface LightboxModalProps {
  images: GalleryImage[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFav: boolean) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function LightboxModal({
  images,
  initialIndex,
  visible,
  onClose,
  onDelete,
  onToggleFavorite,
}: LightboxModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [loadingImg, setLoadingImg] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Sync index when initialIndex changes
  React.useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  const currentImage = images[index];
  if (!currentImage) return null;

  const isFavorite = Boolean(currentImage.favorite);

  const handleNext = () => {
    if (index < images.length - 1) {
      setIndex(index + 1);
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const handleFavoritePress = async () => {
    const nextFav = !isFavorite;
    onToggleFavorite(currentImage.id, nextFav);
    try {
      await apiFetch(`/api/images/${currentImage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: nextFav }),
      });
    } catch (err) {
      console.error('Failed to update favorite status', err);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to remove this photo from your journal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/images/${currentImage.id}`, { method: 'DELETE' });
              onDelete(currentImage.id);
              if (images.length <= 1) {
                onClose();
              } else if (index >= images.length - 1) {
                setIndex(Math.max(0, index - 1));
              }
            } catch (err) {
              Alert.alert('Error', 'Could not delete photo.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Top Action Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.counterText}>
            {index + 1} of {images.length}
          </Text>

          <View style={styles.topRightActions}>
            <TouchableOpacity style={styles.btn} onPress={handleFavoritePress}>
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite ? '#E53E3E' : '#fff'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={() => setShowInfo(!showInfo)}>
              <Ionicons name="information-circle-outline" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btn} onPress={handleDeletePress}>
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Image Stage */}
        <View style={styles.imageStage}>
          {loadingImg && (
            <ActivityIndicator size="large" color="#fff" style={styles.loader} />
          )}

          <Image
            source={{ uri: currentImage.displayUrl || currentImage.thumbUrl }}
            style={styles.image}
            resizeMode="contain"
            onLoadStart={() => setLoadingImg(true)}
            onLoadEnd={() => setLoadingImg(false)}
          />

          {/* Navigation Arrows */}
          {index > 0 && (
            <TouchableOpacity style={[styles.arrowBtn, styles.arrowLeft]} onPress={handlePrev}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {index < images.length - 1 && (
            <TouchableOpacity style={[styles.arrowBtn, styles.arrowRight]} onPress={handleNext}>
              <Ionicons name="chevron-forward" size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Caption & Date Info Footer */}
        <View style={styles.footer}>
          {currentImage.caption ? (
            <Text style={styles.captionText}>{currentImage.caption}</Text>
          ) : null}

          {currentImage.takenAt ? (
            <Text style={styles.dateText}>
              📅 {formatDisplayDate(currentImage.takenAt.split('T')[0])}
            </Text>
          ) : null}

          {showInfo && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>ID: {currentImage.id.slice(0, 8)}...</Text>
              {currentImage.width && currentImage.height ? (
                <Text style={styles.infoText}>
                  Resolution: {currentImage.width} × {currentImage.height} px
                </Text>
              ) : null}
              {currentImage.sizeBytes ? (
                <Text style={styles.infoText}>
                  Size: {(currentImage.sizeBytes / 1024).toFixed(1)} KB
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  topBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  btn: {
    padding: 8,
  },
  counterText: {
    color: '#bbb',
    fontSize: 14,
    fontWeight: '600',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageStage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.72,
  },
  loader: {
    position: 'absolute',
    zIndex: 5,
  },
  arrowBtn: {
    position: 'absolute',
    top: '45%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 6,
    zIndex: 8,
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  captionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  dateText: {
    color: '#888',
    fontSize: 12,
  },
  infoBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 2,
  },
  infoText: {
    color: '#aaa',
    fontSize: 11,
  },
});
