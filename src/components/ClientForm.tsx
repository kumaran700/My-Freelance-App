import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { db, collection, doc, setDoc, updateDoc, Timestamp } from '../lib/firebase';

const ClientForm = () => {
  const { id } = useParams();
  const { clients, user } = useAppContext();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
  });

  useEffect(() => {
    if (id) {
      const client = clients.find(c => c.id === id);
      if (client) {
        setFormData({
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          company: client.company || '',
        });
      }
    }
  }, [id, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const clientData = {
      ...formData,
      ownerId: user.uid,
      updatedAt: Timestamp.now()
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'clients', id), clientData);
      } else {
        const newDocRef = doc(collection(db, 'clients'));
        await setDoc(newDocRef, {
          ...clientData,
          createdAt: Timestamp.now()
        });
      }
      navigate('/clients');
    } catch (error) {
      console.error("Error saving client", error);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors">
        <ArrowLeft size={12} />
        <span>BACK</span>
      </button>

      <div className="card p-5">
        <h2 className="text-xl font-black mb-4 uppercase tracking-tight text-[var(--text-heading)]">{id ? 'EDIT CLIENT' : 'NEW CLIENT'}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="label-caps">Client Name</label>
            <input
              required
              type="text"
              placeholder="e.g. John Doe"
              className="input font-black"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="label-caps">Company</label>
            <input
              type="text"
              placeholder="e.g. Acme Inc."
              className="input font-black"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label-caps">Email Address</label>
              <input
                type="email"
                placeholder="john@example.com"
                className="input font-black"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="label-caps">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 234 567 890"
                className="input font-black"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button type="submit" className="btn-primary flex-1 py-2">
              <Save size={14} />
              <span>{id ? 'UPDATE CLIENT' : 'ADD CLIENT'}</span>
            </button>
            <button 
              type="button" 
              onClick={() => navigate(-1)}
              className="btn-secondary py-2"
            >
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientForm;
