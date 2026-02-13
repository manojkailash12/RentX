import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Advanced3DCustomizer = ({ carId, onClose }) => {
  const [options, setOptions] = useState(null);
  const [customizations, setCustomizations] = useState({
    exteriorColor: 'white',
    interiorColor: 'black',
    wheels: 'standard',
    tint: 'none',
    bodyKit: 'none',
    lighting: 'standard',
    spoiler: false
  });
  const [totalCost, setTotalCost] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions();
    loadSavedCustomization();
  }, [carId]);

  useEffect(() => {
    calculateCost();
  }, [customizations]);

  const fetchOptions = async () => {
    try {
      const { data } = await axios.get('/api/ar-customization/options');
      if (data.success) {
        setOptions(data.options);
      }
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const loadSavedCustomization = async () => {
    try {
      const { data } = await axios.get(`/api/ar-customization/car/${carId}`);
      if (data.success && data.customization) {
        setCustomizations(data.customization.customizations);
      }
    } catch (error) {
      console.error('Error loading customization:', error);
    }
  };

  const calculateCost = async () => {
    try {
      const { data } = await axios.post('/api/ar-customization/calculate-cost', {
        customizations
      });
      if (data.success) {
        setTotalCost(data.totalCost);
      }
    } catch (error) {
      console.error('Error calculating cost:', error);
    }
  };

  const saveCustomization = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/ar-customization/save', {
        carId,
        customizations
      });
      if (data.success) {
        toast.success('Customization saved!');
      }
    } catch (error) {
      toast.error('Failed to save customization');
    } finally {
      setLoading(false);
    }
  };

  if (!options) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">🎨 3D Car Customizer</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ×
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Preview Area */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🚗</div>
                <p className="text-gray-600">3D Preview</p>
                <p className="text-sm text-gray-500 mt-2">
                  Color: {customizations.exteriorColor}
                </p>
              </div>
            </div>

            {/* Customization Options */}
            <div className="space-y-4">
              {/* Exterior Color */}
              <div>
                <label className="block font-semibold mb-2">Exterior Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {options.exteriorColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCustomizations({...customizations, exteriorColor: color})}
                      className={`w-12 h-12 rounded-full border-2 ${
                        customizations.exteriorColor === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Interior Color */}
              <div>
                <label className="block font-semibold mb-2">Interior Color</label>
                <div className="grid grid-cols-6 gap-2">
                  {options.interiorColors.map(color => (
                    <button
                      key={color}
                      onClick={() => setCustomizations({...customizations, interiorColor: color})}
                      className={`w-10 h-10 rounded border-2 ${
                        customizations.interiorColor === color ? 'border-blue-500' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Wheels */}
              <div>
                <label className="block font-semibold mb-2">Wheels</label>
                <select
                  value={customizations.wheels}
                  onChange={(e) => setCustomizations({...customizations, wheels: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {options.wheels.map(wheel => (
                    <option key={wheel.id} value={wheel.id}>
                      {wheel.name} (+${wheel.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Window Tint */}
              <div>
                <label className="block font-semibold mb-2">Window Tint</label>
                <select
                  value={customizations.tint}
                  onChange={(e) => setCustomizations({...customizations, tint: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {options.tint.map(tint => (
                    <option key={tint.id} value={tint.id}>
                      {tint.name} (+${tint.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Body Kit */}
              <div>
                <label className="block font-semibold mb-2">Body Kit</label>
                <select
                  value={customizations.bodyKit}
                  onChange={(e) => setCustomizations({...customizations, bodyKit: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {options.bodyKit.map(kit => (
                    <option key={kit.id} value={kit.id}>
                      {kit.name} (+${kit.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Lighting */}
              <div>
                <label className="block font-semibold mb-2">Lighting</label>
                <select
                  value={customizations.lighting}
                  onChange={(e) => setCustomizations({...customizations, lighting: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {options.lighting.map(light => (
                    <option key={light.id} value={light.id}>
                      {light.name} (+${light.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Spoiler */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={customizations.spoiler}
                  onChange={(e) => setCustomizations({...customizations, spoiler: e.target.checked})}
                  className="mr-2"
                />
                <label>Add Spoiler (+$800)</label>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Customization Cost:</span>
              <span className="text-2xl font-bold text-blue-600">${totalCost}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={saveCustomization}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Customization'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Advanced3DCustomizer;
