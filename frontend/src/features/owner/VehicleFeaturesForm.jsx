import './OwnerVehicles.css';

export default function VehicleFeaturesForm({ features, onChange }) {
  const handleKeyChange = (index, value) => {
    const updated = features.map((f, i) => (i === index ? { ...f, key: value } : f));
    onChange(updated);
  };

  const handleValueChange = (index, value) => {
    const updated = features.map((f, i) => (i === index ? { ...f, value } : f));
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...features, { key: '', value: '' }]);
  };

  const handleRemove = (index) => {
    onChange(features.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="vfeat__list">
        {features.map((f, i) => (
          <div key={i} className="vfeat__row">
            <input
              type="text"
              placeholder="Merkmal (z. B. Küche)"
              value={f.key}
              onChange={(e) => handleKeyChange(i, e.target.value)}
            />
            <input
              type="text"
              placeholder="Wert (z. B. Gasherd + Kühlschrank)"
              value={f.value}
              onChange={(e) => handleValueChange(i, e.target.value)}
            />
            <button
              type="button"
              className="vfeat__remove-btn"
              onClick={() => handleRemove(i)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="vfeat__add-btn" onClick={handleAdd}>
        + Merkmal hinzufügen
      </button>
    </div>
  );
}
