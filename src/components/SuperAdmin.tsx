import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Organization } from '../types';
import { 
  Building2, Users, CreditCard, DollarSign, Calendar, ShieldCheck, 
  Trash2, Edit, Plus, AlertCircle, RefreshCw, Layers, CheckCircle2, XCircle, Search, Filter, KeyRound 
} from 'lucide-react';

export default function SuperAdmin() {
  const { 
    organizations, addOrganization, updateOrganization, deleteOrganization, logout, changePassword, sendPasswordReset, currentUser 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'school' | 'quran' | 'both'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended' | 'expired'>('all');

  // Modal forms states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('123456');
  const [location, setLocation] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [monthlySubscription, setMonthlySubscription] = useState(100);
  const [type, setType] = useState<'school' | 'quran' | 'both'>('school');
  const [status, setStatus] = useState<'active' | 'suspended' | 'expired'>('active');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Handle Form Actions
  const openAddModal = () => {
    setName('');
    setOwnerName('');
    setEmail('');
    setAdminPassword('123456');
    setLocation('');
    setLogoUrl('');
    setMonthlySubscription(100);
    setType('school');
    setStatus('active');
    setModalError(null);
    setModalLoading(false);
    setIsAddModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setName(org.name);
    setOwnerName(org.ownerName);
    setEmail(org.email);
    setLocation(org.location);
    setLogoUrl(org.logoUrl || '');
    setMonthlySubscription(org.monthlySubscription);
    setType(org.type);
    setStatus(org.status);
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await addOrganization({
        name, ownerName, email, location, monthlySubscription, type, status, logoUrl
      }, adminPassword);
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Error creating organization. Please try again.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrg) {
      updateOrganization(editingOrg.id, {
        name, ownerName, email, location, monthlySubscription, type, status, logoUrl
      });
      setIsEditModalOpen(false);
      setEditingOrg(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) {
      setPasswordError('Lama heli karo email-ka isticmaalaha.');
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      await sendPasswordReset(currentUser.email);
      setPasswordSuccess(`Email-ka bedelaada ereyga sirta ah si guul leh ayaa loogu diray: ${currentUser.email}! Fadlan eeg sanduuqaaga fariimaha (Inbox).`);
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Ku guuldareystay dirista email-ka.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleStatus = (org: Organization) => {
    const nextStatus = org.status === 'active' ? 'suspended' : 'active';
    updateOrganization(org.id, { status: nextStatus });
  };

  const handleRenewSubscription = (org: Organization) => {
    updateOrganization(org.id, { status: 'active' });
  };

  // Metrics Calculations
  const totalOrgs = organizations.length;
  const totalSchools = organizations.filter(o => o.type === 'school' || o.type === 'both').length;
  const totalQuranSchools = organizations.filter(o => o.type === 'quran' || o.type === 'both').length;
  const monthlyIncome = organizations
    .filter(o => o.status === 'active')
    .reduce((sum, o) => sum + o.monthlySubscription, 0);
  const pendingPayments = organizations
    .filter(o => o.status === 'expired')
    .reduce((sum, o) => sum + o.monthlySubscription, 0);
  const expiredOrgs = organizations.filter(o => o.status === 'expired').length;

  // Filter & Search Logic
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || org.type === filterType;
    const matchesStatus = filterStatus === 'all' || org.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 card-shadow">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-black text-white rounded-xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-sans font-bold tracking-tight text-slate-900">Super Admin Portal</h1>
            <p className="text-sm text-slate-500">Global SaaS Organization & Subscription Billing Management</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPasswordModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <KeyRound size={15} /> Bedel Password
          </button>
          <button 
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Register Organization
          </button>
          <button 
            onClick={logout}
            className="text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-105 border border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
          <div className="text-slate-900 mb-2"><Building2 size={20} /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total SaaS Orgs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalOrgs}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
          <div className="text-slate-900 mb-2"><Building2 size={20} /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Schools</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalSchools}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
          <div className="text-slate-900 mb-2"><Building2 size={20} /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quran Centers</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalQuranSchools}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
          <div className="text-slate-900 mb-2"><DollarSign size={20} /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Monthly MRR</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${monthlyIncome}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
          <div className="text-slate-900 mb-2"><CreditCard size={20} /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pending Bills</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${pendingPayments}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 card-shadow">
          <div className="text-slate-900 mb-2"><AlertCircle size={20} /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Expired Orgs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{expiredOrgs}</p>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-gray-100 card-shadow overflow-hidden">
        {/* Filters bar */}
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search org, owner or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:border-black"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Filter size={14} /> Type:
            </div>
            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-black"
            >
              <option value="all">All Types</option>
              <option value="school">Regular School</option>
              <option value="quran">Quran School</option>
              <option value="both">Both</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 ml-2">
              Status:
            </div>
            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-black"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                <th className="p-4">Organization Name</th>
                <th className="p-4">Owner Info</th>
                <th className="p-4">Type</th>
                <th className="p-4">MRR Fee</th>
                <th className="p-4">Subscription Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Building2 className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-sm font-medium">No matching organizations found.</p>
                  </td>
                </tr>
              ) : (
                filteredOrgs.map(org => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {org.logoUrl ? (
                          <img 
                            src={org.logoUrl} 
                            alt={org.name} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase ${
                            org.type === 'quran' ? 'bg-emerald-100 text-emerald-800' :
                            org.type === 'school' ? 'bg-blue-100 text-blue-800' : 'bg-slate-900 text-white'
                          }`}>
                            {org.name.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{org.name}</p>
                          <p className="text-xs text-slate-400">{org.location}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <p className="font-medium text-slate-700">{org.ownerName}</p>
                      <p className="text-xs text-slate-400">{org.email}</p>
                    </td>

                    <td className="p-4">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200/50">
                        {org.type === 'school' ? 'Regular School' :
                         org.type === 'quran' ? 'Quran School' : 'Dual Model'}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-900">
                      ${org.monthlySubscription}/mo
                    </td>

                    <td className="p-4">
                      <span className={`status-badge ${
                        org.status === 'active' ? 'bg-success' :
                        org.status === 'suspended' ? 'bg-warning' : 'bg-danger'
                      }`}>
                        {org.status === 'active' && <CheckCircle2 size={12} />}
                        {org.status === 'suspended' && <XCircle size={12} />}
                        {org.status === 'expired' && <AlertCircle size={12} />}
                        {org.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => toggleStatus(org)}
                          title="Toggle Status (Suspend/Activate)"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          <RefreshCw size={15} />
                        </button>
                        <button
                          onClick={() => openEditModal(org)}
                          title="Edit"
                          className="p-1.5 hover:bg-slate-100 hover:text-black rounded-lg text-slate-500 cursor-pointer"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => deleteOrganization(org.id)}
                          title="Delete"
                          className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-500 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4">
            <h3 className="text-lg font-sans font-bold text-slate-900 border-b border-slate-100 pb-3">Register New Organization</h3>
            {modalError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs font-medium">
                {modalError}
              </div>
            )}
            <form onSubmit={handleAddSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Billing & Admin Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Admin Login Password</label>
                  <input
                    type="text"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                    placeholder="e.g. 123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={logoUrl}
                    placeholder="e.g. https://images.unsplash.com/..."
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Monthly Cost ($)</label>
                  <input
                    type="number"
                    required
                    value={monthlySubscription}
                    onChange={(e) => setMonthlySubscription(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">SaaS Model Type</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  >
                    <option value="school">School Only</option>
                    <option value="quran">Quran School</option>
                    <option value="both">Dual (Both)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={modalLoading}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="bg-black hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {modalLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4">
            <h3 className="text-lg font-sans font-bold text-slate-900 border-b border-slate-100 pb-3">Edit Organization</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Owner Full Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Billing Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Organization Logo URL (Optional)</label>
                <input
                  type="url"
                  value={logoUrl}
                  placeholder="e.g. https://images.unsplash.com/... or any image URL"
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Monthly Cost ($)</label>
                  <input
                    type="number"
                    required
                    value={monthlySubscription}
                    onChange={(e) => setMonthlySubscription(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">SaaS Model Type</label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  >
                    <option value="school">School Only</option>
                    <option value="quran">Quran School</option>
                    <option value="both">Dual (Both)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Subscription Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-black"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-105 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-black hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bedel Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs transition-opacity">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <KeyRound size={20} className="text-slate-900" />
              <h3 className="text-lg font-sans font-bold text-slate-900">Bedel Ereyga Sirta ah (Change Password)</h3>
            </div>

            {passwordError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-xs font-medium">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-medium">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                <p>
                  Si aad u bedesho ereygaaga sirta ah si ammaan ah, guji badanka hoose si lagugu soo diro fariin email ah oo ka kooban link-ga bedelaada (Password Reset Link).
                </p>
                <div className="pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block">Email-kaaga:</span>
                  <span className="font-mono text-slate-900 break-all">{currentUser?.email}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={passwordLoading}
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  Iska daa (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-black hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {passwordLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Diraya Email...
                    </>
                  ) : (
                    'Soo Dir Email-ka Bedelaada'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
