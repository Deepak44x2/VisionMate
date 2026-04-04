
import React, { useState, useRef } from 'react';
import { SupportedLanguage, type CommandMapping, type KnownFace } from '../types';
import { Trash2, Upload } from 'lucide-react';

  interface VoiceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    mappings: CommandMapping[];
    onSave: (mappings: CommandMapping[]) => void;
    emergencyContact: string;
    onSaveContact: (contact: string) => void;
    knownFaces: KnownFace[];
    onSaveKnownFaces: (faces: KnownFace[]) => void;
    language: SupportedLanguage;
    onSaveLanguage: (lang: SupportedLanguage) => void;
  }

  const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
    isOpen,
    onClose,
    mappings,
    onSave,
    emergencyContact,
    onSaveContact,
    knownFaces,
    onSaveKnownFaces,
    language,
    onSaveLanguage
  }) => {
    const [localMappings] = useState<CommandMapping[]>(mappings);
    const [localContact, setLocalContact] = useState(emergencyContact);
    const [localLanguage, setLocalLanguage] = useState(language);
    const [localFaces, setLocalFaces] = useState<KnownFace[]>(knownFaces);
    const [newFaceName, setNewFaceName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleSave = () => {
      onSave(localMappings);
      onSaveContact(localContact);
      onSaveLanguage(localLanguage);
      onSaveKnownFaces(localFaces);
      onClose();
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!newFaceName.trim()) {
        alert("Please enter a name for the face first.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix if present (e.g., data:image/jpeg;base64,)
        const base64Data = base64String.split(',')[1] || base64String;
        
        const newFace: KnownFace = {
          id: Date.now().toString(),
          name: newFaceName.trim(),
          imageBase64: base64Data
        };
        
        setLocalFaces([...localFaces, newFace]);
        setNewFaceName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    };

    const removeFace = (id: string) => {
      setLocalFaces(localFaces.filter(f => f.id !== id));
    };

    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 w-full max-w-md rounded-3xl p-6 max-h-[90vh] overflow-y-auto border border-gray-700">
          <h2 className="text-2xl font-bold text-eyefi-primary mb-6">Settings</h2>

          <div className="mb-6">
            <label className="block text-white font-bold mb-2">Language</label>
            <select
              value={localLanguage}
              onChange={(e) => setLocalLanguage(e.target.value as SupportedLanguage)}
              className="w-full p-3 rounded-xl bg-gray-800 text-white border border-gray-700 outline-none"
            >
              {Object.entries(SupportedLanguage).map(([key, val]) => (
                <option key={key} value={val}>{val}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-white font-bold mb-2">Emergency Contact</label>
            <input
              type="tel"
              value={localContact}
              onChange={(e) => setLocalContact(e.target.value)}
              placeholder="+1234567890"
              className="w-full p-3 rounded-xl bg-gray-800 text-white border border-gray-700 outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-white font-bold mb-2">Known Faces</label>
            <p className="text-red-400 text-sm mb-3">Add faces to help VisionMate  recognize people you know.</p>
            
            <div className="space-y-3 mb-4">
              {localFaces.map(face => (
                <div key={face.id} className="flex items-center justify-between bg-gray-800 p-3 rounded-xl border border-gray-700">
                  <div className="flex items-center gap-3">
                    <img src={`data:image/jpeg;base64,${face.imageBase64}`} alt={face.name} className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-white font-medium">{face.name}</span>
                  </div>
                  <button onClick={() => removeFace(face.id)} className="p-2 text-eyefi-alert hover:bg-gray-700 rounded-full">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              {localFaces.length === 0 && (
                <p className="text-gray-500 text-sm italic">No faces added yet.</p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newFaceName}
                onChange={(e) => setNewFaceName(e.target.value)}
                placeholder="Person's Name"
                className="flex-1 p-3 rounded-xl bg-gray-800 text-white border border-gray-700 outline-none"
              />
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={!newFaceName.trim()}
                className="px-4 py-3 rounded-xl bg-gray-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={20} />
                Add
              </button>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={onClose} className="px-6 py-3 rounded-xl bg-gray-700 text-white font-bold">
              Cancel
            </button>
            <button onClick={handleSave} className="px-6 py-3 rounded-xl bg-eyefi-primary text-white font-bold">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  export default VoiceSettingsModal;

  