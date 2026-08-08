'use client';

import React, { useState, useEffect } from 'react';
import { verifyAdminSession, getEventTimelinesAdmin, updateEventTimelinesAdmin, EventTimelinesData } from '@/app/admin/actions';

export default function AdminSettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [timelines, setTimelines] = useState<EventTimelinesData | null>(null);

  useEffect(() => {
    (async () => {
      const valid = await verifyAdminSession();
      setIsAuthenticated(valid);
      if (valid) {
        setLoading(true);
        const res = await getEventTimelinesAdmin();
        if (res.success && res.timelines) {
          setTimelines(res.timelines);
        } else {
          setMsg({ type: 'error', text: 'Failed to load settings.' });
        }
        setLoading(false);
      } else {
        setLoading(false);
        window.location.href = '/api/logout';
      }
    })();
  }, []);

  const handleSave = async (updatedTimelines: EventTimelinesData) => {
    setLoading(true);
    setMsg(null);
    const res = await updateEventTimelinesAdmin(updatedTimelines);
    if (res.success) {
      setTimelines(updatedTimelines);
      setMsg({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => setMsg(null), 3000);
    } else {
      setMsg({ type: 'error', text: res.error || 'Failed to update settings.' });
    }
    setLoading(false);
  };

  const handleToggleConsentLetter = () => {
    if (!timelines) return;
    handleSave({ ...timelines, consentLetterEnabled: !timelines.consentLetterEnabled });
  };



  const handleSaveCountdown = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!timelines) return;
    const formData = new FormData(e.currentTarget);
    const endTime = formData.get('countdownEndTime') as string;
    handleSave({ ...timelines, countdownEndTime: endTime });
  };

  const handleClearCountdown = () => {
    if (!timelines) return;
    handleSave({ ...timelines, countdownEndTime: '' });
  };

  if (isAuthenticated === null || loading) {
    return <div className="p-8 text-gray-500 font-medium">Loading settings...</div>;
  }

  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Global Settings</h1>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Manage global dashboard configurations and countdown timers here.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-6 p-4 rounded-md shadow-sm border ${msg.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
          <div className="flex items-center space-x-2">
            <span className="font-semibold">{msg.type === 'error' ? 'Error' : 'Success'}</span>
            <span>{msg.text}</span>
          </div>
        </div>
      )}

      {timelines && (
        <div className="space-y-6">
          {/* Section 1: Dashboard Toggles */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Dashboard Toggles</h2>
              <p className="text-sm text-gray-500 mt-1">Control visibility of elements across participant dashboards.</p>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Consent Letter Toggle */}
              <div className="flex items-center justify-between pb-6 border-b border-gray-100 last:pb-0 last:border-0">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Consent Letter Tab</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, the Consent Letter tab will be visible in the Team Dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleConsentLetter}
                  className={`${
                    timelines.consentLetterEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                >
                  <span
                    aria-hidden="true"
                    className={`${
                      timelines.consentLetterEnabled ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>



            </div>
          </div>

          {/* Section 2: Countdown Timer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">Hero Countdown Timer</h2>
              <p className="text-sm text-gray-500 mt-1">Set the end time for the countdown timer displayed on the main landing page.</p>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveCountdown} className="space-y-4">
                <div>
                  <label htmlFor="countdownEndTime" className="block text-sm font-medium text-gray-700">
                    Countdown End Time
                  </label>
                  <div className="mt-1 flex items-center gap-4">
                    <input
                      type="datetime-local"
                      name="countdownEndTime"
                      id="countdownEndTime"
                      defaultValue={timelines.countdownEndTime || ''}
                      className="block w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2 border"
                    />
                    <button
                      type="submit"
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Save Time
                    </button>
                    {timelines.countdownEndTime && (
                      <button
                        type="button"
                        onClick={handleClearCountdown}
                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Clear Timer
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Leave blank or click "Clear Timer" to completely remove the countdown from the landing page. The timer will automatically hide itself when this time is reached.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
