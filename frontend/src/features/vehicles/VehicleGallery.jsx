import { useState } from 'react';
import './VehicleGallery.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost/grape/backend/public';

export default function VehicleGallery({ images = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="vg vg--empty">
        <span>Keine Bilder vorhanden</span>
      </div>
    );
  }

  const activeImage = images[activeIndex];
  const src = `${API_URL}/${activeImage.file_path}`;

  const goPrev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % images.length);

  return (
    <div className="vg">
      {/* Main image */}
      <div className="vg__main">
        <img
          src={src}
          alt={activeImage.alt_text || 'Fahrzeugbild'}
          className="vg__main-img"
        />

        {images.length > 1 && (
          <>
            <button type="button" className="vg__nav vg__nav--prev" onClick={goPrev} aria-label="Vorheriges Bild">‹</button>
            <button type="button" className="vg__nav vg__nav--next" onClick={goNext} aria-label="Nächstes Bild">›</button>
            <span className="vg__counter">{activeIndex + 1} / {images.length}</span>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="vg__thumbs">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className={`vg__thumb ${i === activeIndex ? 'vg__thumb--active' : ''}`}
              onClick={() => setActiveIndex(i)}
            >
              <img
                src={`${API_URL}/${img.file_path}`}
                alt={img.alt_text || `Bild ${i + 1}`}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}