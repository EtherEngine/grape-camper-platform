import { useState, useCallback, useRef } from 'react';
import OwnerVehiclesApi from './OwnerVehiclesApi';
import './OwnerVehicles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT_STR = '.jpg,.jpeg,.png,.webp';

export default function VehicleImagesForm({ vehicleId, images, onImagesChange }) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState([]);     // { file, url, error? }
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);       // 0-100
  const inputRef = useRef(null);
  const dragCountRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  // ── File selection ───────────────────────────────────
  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Nur JPEG, PNG und WebP erlaubt.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Max. 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    }
    return null;
  };

  const addFiles = useCallback((fileList) => {
    const newPreviews = Array.from(fileList).map((file) => {
      const err = validateFile(file);
      return { file, url: URL.createObjectURL(file), error: err };
    });
    setPreviews((prev) => [...prev, ...newPreviews]);
    setError(null);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const removePreview = (index) => {
    setPreviews((prev) => {
      const item = prev[index];
      if (item?.url) URL.revokeObjectURL(item.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ── Drag & Drop ──────────────────────────────────────
  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCountRef.current++;
    setDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) { setDragOver(false); dragCountRef.current = 0; }
  };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // ── Upload all valid previews ────────────────────────
  const handleUploadAll = async () => {
    const valid = previews.filter((p) => !p.error);
    if (valid.length === 0) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    const uploaded = [];
    const errors = [];

    for (let i = 0; i < valid.length; i++) {
      const { file } = valid[i];
      const formData = new FormData();
      formData.append('image', file);
      formData.append('sort_order', String(images.length + i));
      if (images.length === 0 && i === 0) formData.append('is_cover', '1');

      try {
        const res = await OwnerVehiclesApi.addImage(vehicleId, formData);
        uploaded.push(res.data.data);
      } catch (err) {
        errors.push(`${file.name}: ${err.message || 'Fehler'}`);
      }

      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    if (uploaded.length > 0) {
      onImagesChange([...images, ...uploaded]);
    }
    if (errors.length > 0) {
      setError(errors.join(' | '));
    }

    // Clean up previews
    previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
    setPreviews([]);
    setUploading(false);
    setProgress(0);
  };

  // ── Delete existing image ────────────────────────────
  const handleDelete = async (imageId) => {
    if (!confirm('Bild wirklich löschen?')) return;

    try {
      await OwnerVehiclesApi.deleteImage(vehicleId, imageId);
      onImagesChange(images.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err.message || 'Bild konnte nicht gelöscht werden.');
    }
  };

  // ── Set cover ────────────────────────────────────────
  const handleSetCover = (imageId) => {
    onImagesChange(
      images.map((i) => ({
        ...i,
        is_cover: i.id === imageId ? '1' : '0',
      }))
    );
  };

  const validCount = previews.filter((p) => !p.error).length;

  return (
    <div>
      {error && <div className="vform__error">{error}</div>}

      {/* ── Existing images ────────────────────────── */}
      {images.length > 0 && (
        <div className="vimg__list">
          {images.map((img) => {
            const isCover = img.is_cover === '1' || img.is_cover === 1;
            return (
              <div key={img.id} className={`vimg__item ${isCover ? 'vimg__item--cover' : ''}`}>
                {isCover && <span className="vimg__cover-tag">Cover</span>}
                <img src={`${API_URL}${img.file_path}`} alt={img.alt_text || 'Fahrzeugbild'} />
                <div className="vimg__item-actions">
                  {!isCover && (
                    <button type="button" className="vimg__item-btn" onClick={() => handleSetCover(img.id)}>
                      Cover
                    </button>
                  )}
                  <button type="button" className="vimg__item-btn vimg__item-btn--danger" onClick={() => handleDelete(img.id)}>
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Preview grid ───────────────────────────── */}
      {previews.length > 0 && (
        <>
          <div className="vimg__preview-grid">
            {previews.map((p, idx) => (
              <div key={idx} className={`vimg__preview-card ${p.error ? 'vimg__preview-card--error' : ''}`}>
                <img src={p.url} alt="Vorschau" className="vimg__preview-img" />
                <div className="vimg__preview-info">
                  <span className="vimg__preview-name">{p.file.name}</span>
                  <span className="vimg__preview-size">{(p.file.size / 1024).toFixed(0)} KB</span>
                  {p.error && <span className="vimg__preview-error">{p.error}</span>}
                </div>
                <button type="button" className="vimg__preview-remove" onClick={() => removePreview(idx)} title="Entfernen">
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="vimg__progress">
              <div className="vimg__progress-bar" style={{ width: `${progress}%` }} />
              <span className="vimg__progress-text">{progress}%</span>
            </div>
          )}

          <div className="vimg__preview-actions">
            <button
              type="button"
              className="vimg__upload-btn"
              onClick={handleUploadAll}
              disabled={uploading || validCount === 0}
            >
              {uploading ? `Wird hochgeladen… (${progress}%)` : `${validCount} Bild${validCount !== 1 ? 'er' : ''} hochladen`}
            </button>
            <button
              type="button"
              className="vimg__clear-btn"
              onClick={() => {
                previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
                setPreviews([]);
              }}
              disabled={uploading}
            >
              Alle entfernen
            </button>
          </div>
        </>
      )}

      {/* ── Drop zone ──────────────────────────────── */}
      <div
        className={`vimg__upload-zone ${dragOver ? 'vimg__upload-zone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="vimg__zone-content">
          <span className="vimg__zone-icon">📷</span>
          <span>Bilder hierher ziehen oder klicken</span>
          <span className="vimg__zone-hint">JPG, PNG, WebP · max. 5 MB</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STR}
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
