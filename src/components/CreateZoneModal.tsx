import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { LoaderIcon, XIcon } from 'lucide-react';
import { zonesApi, type Zone } from '../api/zonesApi';
import { ReusableInputField } from './ReusableInputField';

interface CreateZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (zone: Zone) => void;
  /** Zones already loaded, so a duplicate name is caught before the request (the API enforces it too). */
  existingZones: Zone[];
}

/** Creates a zone without leaving the current form — used where a zone is picked, e.g. the office form. */
export function CreateZoneModal({ isOpen, onClose, onCreated, existingZones }: CreateZoneModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const duplicate = !!trimmed && existingZones.some((z) => z.name.trim().toLowerCase() === trimmed.toLowerCase());

  const close = () => {
    setName('');
    setDescription('');
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || duplicate) return;
    setSaving(true);
    try {
      const zone = await zonesApi.create({ name: trimmed, description: description.trim() || null });
      toast.success(`${zone.name} zone created.`);
      setName('');
      setDescription('');
      onCreated(zone);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create zone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <button type="button" onClick={close} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <XIcon size={18} />
            </button>

            <div>
              <h3 className="text-lg font-heading font-bold text-gray-900">New zone</h3>
              <p className="text-sm font-body text-gray-500 mt-1">It will be selected for this office once created.</p>
            </div>

            <ReusableInputField
              label="Name"
              name="zoneName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={duplicate ? 'A zone with this name already exists.' : undefined}
              touched={duplicate}
              required
            />
            <ReusableInputField label="Description" name="zoneDescription" as="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={close} className="px-4 py-2 text-sm font-heading font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !trimmed || duplicate}
                className="flex items-center gap-2 bg-accent hover:bg-[#e64a19] text-white text-sm font-heading font-bold px-5 py-2 rounded-lg disabled:opacity-60"
              >
                {saving && <LoaderIcon size={16} className="animate-spin" />}
                Create Zone
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
