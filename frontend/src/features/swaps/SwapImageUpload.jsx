import { useState, useCallback, useRef } from 'react';
import SwapsApi from './SwapsApi';
import './SwapImageUpload.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT_STR = '.jpg,.jpeg,.png,.webp';

/**
 * Image upload component for swap offers.
 *
 * @param {{ swapId: number, images: array, onImagesChange: (imgs) => void }} props
 */
export default function SwapImageUpload({ swapId, images = [], onImagesChange }) {
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const dragCountRef = useRef(0);

  // ── Validation ───────────────────────────────────────
  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Nur JPEG, PNG und WebP erlaubt.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Max. 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
    }
    return null;
  };

  // ── File selection ───────────────────────────────────
  const addFiles = useCallback((fileList) => {
    const items = Array.from(fileList).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      error: validateFile(file),
    }));
    setPreviews((prev) => [...prev, ...items]);
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

  // ── Drag & drop ──────────────────────────────────────
  const onDragEnter = (e) => { e.preventDefault(); dragCountRef.current++; setDragOver(true); };
  const onDragLeave = (e) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) { setDragOver(false); dragCountRef.current = 0; }
  };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  // ── Upload ───────────────────────────────────────────
  const handleUploadAll = async () => {
    const valid = previews.filter((p) => !p.error);
    if (!valid.length) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    const uploaded = [];
    const errors = [];

    for (let i = 0; i < valid.length; i++) {
      const { file } = valid[i];
      const fd = new FormData();
      fd.append('image', file);

      try {
        const res = await SwapsApi.addImage(swapId, fd);
        uploaded.push(res.data.data);
      } catch (err) {
        errors.push(`${file.name}: ${err.message || 'Fehler'}`);
      }

      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    if (uploaded.length) onImagesChange([...images, ...uploaded]);
    if (errors.length) setError(errors.join(' | '));

    previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
    setPreviews([]);
    setUploading(false);
    setProgress(0);
  };

  // ── Delete existing ──────────────────────────────────
  const handleDelete = async (imageId) => {
    if (!confirm('Bild wirklich löschen?')) return;

    try {
      await SwapsApi.deleteImage(swapId, imageId);
      onImagesChange(images.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err.message || 'Bild konnte nicht gelöscht werden.');
    }
  };

  const validCount = previews.filter((p) => !p.error).length;

  return (
    <div className="simg">
      {error && <div className="simg__error">{error}</div>}

      {/* ── Existing images ───────────────────────── */}
      {images.length > 0 && (
        <div className="simg__grid">
          {images.map((img) => (
            <div key={img.id} className="simg__card">
              <img
                src={`${API_URL}${img.file_path}`}
                alt={img.alt_text || 'Swap-Bild'}
                className="simg__card-img"
              />
              <button
                type="button"
                className="simg__card-delete"
                onClick={() => handleDelete(img.id)}
                title="Löschen"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Preview grid ──────────────────────────── */}
      {previews.length > 0 && (
        <>
          <div className="simg__preview-grid">
            {previews.map((p, idx) => (
              <div key={idx} className={`simg__preview ${p.error ? 'simg__preview--error' : ''}`}>
                <img src={p.url} alt="Vorschau" className="simg__preview-img" />
                <div className="simg__preview-meta">
                  <span className="simg__preview-name">{p.file.name}</span>
                  <span className="simg__preview-size">{(p.file.size / 1024).toFixed(0)} KB</span>
                  {p.error && <span className="simg__preview-err">{p.error}</span>}
                </div>
                <button type="button" className="simg__preview-remove" onClick={() => removePreview(idx)}>✕</button>
              </div>
            ))}
          </div>

          {uploading && (
            <div className="simg__progress">
              <div className="simg__progress-bar" style={{ width: `${progress}%` }} />
              <span className="simg__progress-text">{progress}%</span>
            </div>
          )}

          <div className="simg__actions">
            <button
              type="button"
              className="simg__upload-btn"
              onClick={handleUploadAll}
              disabled={uploading || !validCount}
            >
              {uploading
                ? `Hochladen… (${progress}%)`
                : `${validCount} Bild${validCount !== 1 ? 'er' : ''} hochladen`}
            </button>
            <button
              type="button"
              className="simg__clear-btn"
              onClick={() => {
                previews.forEach((p) => { if (p.url) URL.revokeObjectURL(p.url); });
                setPreviews([]);
              }}
              disabled={uploading}
            >
              Verwerfen
            </button>
          </div>
        </>
      )}

      {/* ── Drop zone ─────────────────────────────── */}
      <div
        className={`simg__dropzone ${dragOver ? 'simg__dropzone--active' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <span className="simg__dropzone-icon">📷</span>
        <span>Bilder hierher ziehen oder klicken</span>
        <span className="simg__dropzone-hint">JPG, PNG, WebP · max. 5 MB</span>
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
