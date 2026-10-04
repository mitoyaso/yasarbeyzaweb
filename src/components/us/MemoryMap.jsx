import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  geotaggedPhotos,
  photosWithoutLocation,
  mapCenter,
  mapZoom,
  locationLabel,
  groupByLocation,
} from '../../lib/geo';
import { updatePhotoLocation, clearPhotoLocation } from '../../lib/supabase';
import { useModalA11y } from '../../lib/useModalA11y';
import {
  X,
  MapPin,
  Crosshair,
  Loader2,
  Check,
  Trash2,
  Map as MapIcon,
  Info,
} from 'lucide-react';

/**
 * Anı Haritası: konum eklenmiş anılar haritada kalp işaretleriyle görünür.
 * Konum eklemek için alttaki şeritten bir anı seçip haritada dokunman yeterli.
 */
export default function MemoryMap({ photos = [], onClose, onPhotoUpdated, showToast }) {
  const dialogRef = useModalA11y({ onClose });

  const mapHostRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const leafletRef = useRef(null);

  // Harita bir kez kurulur; başlangıç görünümü ilk açılışta hesaplanır.
  const [initialCenter] = useState(() => mapCenter(photos));
  const [initialZoom] = useState(() => mapZoom(photos));

  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [editingPhoto, setEditingPhoto] = useState(null);
  const [pendingPoint, setPendingPoint] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tagged = useMemo(() => geotaggedPhotos(photos), [photos]);
  const untagged = useMemo(() => photosWithoutLocation(photos), [photos]);
  const gruplar = useMemo(() => groupByLocation(photos), [photos]);

  // ---------------------------------------------------------------------------
  // Haritayı kur (leaflet yalnızca bu pencere açıldığında indirilir)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Harita kütüphanesi ve stili yalnızca bu pencere açıldığında indirilir.
        const module = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        const L = module.default ?? module;
        if (cancelled || !mapHostRef.current) return;

        leafletRef.current = L;

        const map = L.map(mapHostRef.current, {
          zoomControl: true,
          attributionControl: true,
        }).setView([initialCenter.lat, initialCenter.lng], initialZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap katkıcıları',
        }).addTo(map);

        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;
        setIsMapReady(true);

        // Pencere animasyonu bittikten sonra boyutu yeniden hesapla
        setTimeout(() => map.invalidateSize(), 250);
      } catch (err) {
        console.error('Harita yüklenemedi:', err);
        if (!cancelled) {
          setMapError('Harita yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initialCenter, initialZoom]);

  // ---------------------------------------------------------------------------
  // İşaretleri çiz
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    if (!isMapReady || !L || !layer) return;

    layer.clearLayers();

    const heartIcon = L.divIcon({
      className: 'sev-map-marker',
      html:
        '<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;' +
        'border-radius:9999px;background:linear-gradient(135deg,#f43f5e,#ec4899);color:#fff;' +
        'font-size:15px;box-shadow:0 4px 10px rgba(244,63,94,.45);border:2px solid #fff;">💖</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -14],
    });

    for (const photo of tagged) {
      const marker = L.marker([Number(photo.latitude), Number(photo.longitude)], {
        icon: heartIcon,
        title: photo.caption || 'Anımız',
      });

      // Popup içeriği DOM ile kurulur (metinler güvenli şekilde yerleştirilir)
      const box = document.createElement('div');
      box.style.width = '180px';

      const img = document.createElement('img');
      img.src = photo.thumb_url || photo.url;
      img.alt = photo.caption || 'Anımız';
      img.style.width = '100%';
      img.style.height = '110px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '10px';
      img.style.marginBottom = '6px';
      box.appendChild(img);

      if (photo.caption) {
        const caption = document.createElement('div');
        caption.textContent = photo.caption;
        caption.style.fontSize = '12px';
        caption.style.fontWeight = '600';
        caption.style.color = '#881337';
        caption.style.marginBottom = '2px';
        box.appendChild(caption);
      }

      const place = document.createElement('div');
      place.textContent = locationLabel(photo);
      place.style.fontSize = '11px';
      place.style.color = '#9f1239';
      box.appendChild(place);

      marker.bindPopup(box);
      marker.addTo(layer);
    }

    // Konum seçilirken geçici işaret
    if (pendingPoint) {
      const pin = L.circleMarker([pendingPoint.lat, pendingPoint.lng], {
        radius: 9,
        color: '#0f766e',
        weight: 3,
        fillColor: '#14b8a6',
        fillOpacity: 0.9,
      });
      pin.addTo(layer);
    }
  }, [tagged, isMapReady, pendingPoint]);

  // ---------------------------------------------------------------------------
  // Haritaya tıklayarak konum seçme
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return undefined;

    const handleClick = (event) => {
      if (!editingPhoto) return;
      setPendingPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [isMapReady, editingPhoto]);

  // ---------------------------------------------------------------------------
  // İşlemler
  // ---------------------------------------------------------------------------
  const startEditing = (photo) => {
    setEditingPhoto(photo);
    setLocationName(photo.location_name || '');
    setPendingPoint(
      Number.isFinite(Number(photo.latitude)) && photo.latitude !== null
        ? { lat: Number(photo.latitude), lng: Number(photo.longitude) }
        : null
    );
  };

  const cancelEditing = () => {
    setEditingPhoto(null);
    setPendingPoint(null);
    setLocationName('');
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      if (showToast) showToast('Bu tarayıcı konum servisini desteklemiyor.', 'info');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setPendingPoint(point);
        mapRef.current?.setView([point.lat, point.lng], 15);
      },
      () => {
        if (showToast) showToast('Konum alınamadı. Tarayıcı izinlerini kontrol et.', 'info');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    if (!editingPhoto || !pendingPoint) return;

    setIsSaving(true);
    try {
      await updatePhotoLocation(editingPhoto.id, {
        latitude: pendingPoint.lat,
        longitude: pendingPoint.lng,
        locationName,
      });

      if (onPhotoUpdated) {
        onPhotoUpdated(editingPhoto.id, {
          latitude: pendingPoint.lat,
          longitude: pendingPoint.lng,
          location_name: locationName.trim() || null,
        });
      }

      if (showToast) showToast('Konum kaydedildi 📍', 'success');
      cancelEditing();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Konum kaydedilemedi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    if (!editingPhoto) return;

    setIsSaving(true);
    try {
      await clearPhotoLocation(editingPhoto.id);
      if (onPhotoUpdated) {
        onPhotoUpdated(editingPhoto.id, { latitude: null, longitude: null, location_name: null });
      }
      if (showToast) showToast('Konum kaldırıldı.', 'info');
      cancelEditing();
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Konum kaldırılamadı.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-rose-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Anı Haritası"
        className="w-full max-w-3xl glass-panel bg-white/95 rounded-3xl shadow-2xl border border-rose-200 my-auto overflow-hidden"
      >
        {/* Başlık */}
        <div className="flex items-center justify-between p-4 border-b border-rose-100">
          <div className="flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-rose-950 font-serif">
                Anı Haritası
              </h3>
              <p className="text-[11px] text-rose-500 font-medium">
                {tagged.length} anının konumu işaretli
                {untagged.length > 0 && ` · ${untagged.length} anı konum bekliyor`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="p-2 rounded-full text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Harita */}
        <div className="relative">
          {mapError ? (
            <div className="h-[45vh] flex items-center justify-center bg-rose-50 text-center px-6">
              <p className="text-sm text-rose-700 font-medium">{mapError}</p>
            </div>
          ) : (
            <>
              <div ref={mapHostRef} className="h-[45vh] w-full bg-rose-50" />
              {!isMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-rose-50/80">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-400" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Alt panel */}
        <div className="p-4 max-h-[36vh] overflow-y-auto">
          {editingPhoto ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3.5">
              <p className="text-xs font-bold text-teal-900 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Konum seçiliyor: {editingPhoto.caption || 'İsimsiz anı'}
              </p>
              <p className="text-[11px] text-teal-800/90 mb-3 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {pendingPoint
                  ? 'Konum seçildi. İstersen bir isim yazıp kaydet.'
                  : 'Haritada anının olduğu yere dokun ya da "Konumumu kullan" düğmesine bas.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="Yer adı (isteğe bağlı) — örn. Kapadokya"
                  className="flex-1 px-3 py-2.5 rounded-xl glass-input text-rose-950 placeholder-rose-300 text-xs font-medium"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="py-2.5 px-3 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition flex items-center gap-1.5 cursor-pointer"
                    title="Şu anki konumumu kullan"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Konumum</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!pendingPoint || isSaving}
                    className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Kaydet</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2.5">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                {editingPhoto.latitude !== null && editingPhoto.latitude !== undefined && (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isSaving}
                    className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Konumu kaldır
                  </button>
                )}
              </div>
            </div>
          ) : untagged.length > 0 ? (
            <>
              <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2">
                Konum eklemek için bir anı seç
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {untagged.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => startEditing(photo)}
                    className="shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 border-rose-200 hover:border-rose-400 transition cursor-pointer relative group"
                    title={photo.caption || 'Konum ekle'}
                  >
                    <img
                      src={photo.thumb_url || photo.url}
                      alt={photo.caption || 'Anı'}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-0 bg-rose-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-white" />
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[11px] text-rose-500 text-center py-2">
              Tüm anıların konumu eklenmiş 💖
            </p>
          )}

          {/* Konum listesi */}
          {gruplar.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2">
                Konumlar
              </p>
              <div className="flex flex-wrap gap-2">
                {gruplar.map((grup) => (
                  <span
                    key={grup.etiket}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700"
                  >
                    <MapPin className="w-3 h-3" />
                    {grup.etiket}
                    <span className="text-rose-400">· {grup.adet}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
