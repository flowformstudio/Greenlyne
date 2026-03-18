import { useState } from 'react'

const TABS = ['Bulk Upload', 'Geo Campaign']

export default function Campaigns() {
  const [activeTab, setActiveTab] = useState('Bulk Upload')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Campaigns</h1>
        <p className="text-sm text-gray-500 mt-1">Manage bulk upload and geo-targeting campaigns</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
              ${activeTab === tab
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <p className="text-sm text-gray-400 text-center py-20">
          [ {activeTab} — content coming ]
        </p>
      </div>
    </div>
  )
}
