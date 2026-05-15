// Authority - Policy Management
import { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Shield, Save, AlertTriangle, Clock, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';

export default function AuthorityPolicies() {
  const { policies, updatePolicies, toggleEmergency } = useData();
  const [formData, setFormData] = useState({
    dailyLimit: 2,
    weeklyLimit: 7,
    monthlyLimit: 15,
    timeRestrictionStart: '22:00',
    timeRestrictionEnd: '06:00',
    maxAlcoholPercentage: 42.8,
    minAge: 21,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (policies) {
      setFormData({
        dailyLimit: policies.dailyLimit || 2,
        weeklyLimit: policies.weeklyLimit || 7,
        monthlyLimit: policies.monthlyLimit || 15,
        timeRestrictionStart: policies.timeRestrictionStart || '22:00',
        timeRestrictionEnd: policies.timeRestrictionEnd || '06:00',
        maxAlcoholPercentage: policies.maxAlcoholPercentage || 42.8,
        minAge: policies.minAge || 21,
      });
    }
  }, [policies]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePolicies({ ...policies, ...formData });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Policy update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEmergencyToggle = async () => {
    setToggling(true);
    try {
      await toggleEmergency();
    } catch (err) {
      console.error('Emergency toggle error:', err);
    } finally {
      setToggling(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-accent-purple" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-dark-100">Policy Management</h1>
          <p className="text-sm text-dark-400">Configure alcohol sale regulations and restrictions</p>
        </div>
      </div>

      {/* Emergency Control */}
      <div className={`glass-card p-5 border ${policies?.emergencyFlag ? 'border-accent-red/40' : 'border-dark-600/40'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${policies?.emergencyFlag ? 'bg-accent-red/15' : 'bg-dark-700'}`}>
              <AlertTriangle className={`w-6 h-6 ${policies?.emergencyFlag ? 'text-accent-red animate-pulse' : 'text-dark-400'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-dark-100">Emergency Restriction</h3>
              <p className="text-sm text-dark-400 mt-0.5">
                {policies?.emergencyFlag
                  ? 'All alcohol sales are currently BLOCKED across all shops'
                  : 'Enable to immediately halt all alcohol sales system-wide'}
              </p>
            </div>
          </div>
          <button
            onClick={handleEmergencyToggle}
            disabled={toggling}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all ${
              policies?.emergencyFlag
                ? 'bg-accent-green/15 text-accent-green border border-accent-green/30 hover:bg-accent-green/25'
                : 'bg-accent-red/15 text-accent-red border border-accent-red/30 hover:bg-accent-red/25'
            }`}
          >
            {toggling ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : policies?.emergencyFlag ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
            {policies?.emergencyFlag ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quota Limits */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
            Quota Limits
          </h3>
          <div className="space-y-4">
            {[
              { key: 'dailyLimit', label: 'Daily Limit', desc: 'Max units per buyer per day', max: 10 },
              { key: 'weeklyLimit', label: 'Weekly Limit', desc: 'Max units per buyer per week', max: 30 },
              { key: 'monthlyLimit', label: 'Monthly Limit', desc: 'Max units per buyer per month', max: 100 },
            ].map(({ key, label, desc, max }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-dark-200 font-medium">{label}</label>
                  <span className="text-sm font-mono text-accent-cyan font-bold">{formData[key]}</span>
                </div>
                <p className="text-xs text-dark-400 mb-2">{desc}</p>
                <input
                  type="range"
                  min="0"
                  max={max}
                  value={formData[key]}
                  onChange={(e) => handleChange(key, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-dark-500">0</span>
                  <span className="text-[10px] text-dark-500">{max}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time & Other Restrictions */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-amber" />
              Time Restrictions
            </h3>
            <p className="text-xs text-dark-400 mb-4">
              Sales are blocked during this time window (e.g., 22:00 to 06:00 = overnight ban)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={formData.timeRestrictionStart}
                  onChange={(e) => handleChange('timeRestrictionStart', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={formData.timeRestrictionEnd}
                  onChange={(e) => handleChange('timeRestrictionEnd', e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
              Additional Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Max Alcohol Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.maxAlcoholPercentage}
                  onChange={(e) => handleChange('maxAlcoholPercentage', parseFloat(e.target.value))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-300 mb-1.5">Minimum Age Requirement</label>
                <input
                  type="number"
                  value={formData.minAge}
                  onChange={(e) => handleChange('minAge', parseInt(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-accent-green font-medium animate-fade-in">
            ✓ Policies saved successfully
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Policies'}
        </button>
      </div>

      {/* Last Updated */}
      {policies?.lastUpdated && (
        <p className="text-xs text-dark-500 text-right">
          Last updated: {new Date(policies.lastUpdated).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}
