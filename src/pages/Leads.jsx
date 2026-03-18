import { useState } from 'react'

const TABS = ['All Leads', 'Quick Prescreen', 'Bulk Upload', 'Geo Campaign']

export default function Leads() {
  const [activeTab, setActiveTab] = useState('All Leads')

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">All leads across sources</p>
        </div>
        <button className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          + Add Leads
        </button>
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

      {/* Table placeholder */}
      <div className="bg-white rounded-xl border border-gray-200">
        <p className="text-sm text-gray-400 text-center py-20">
          [ {activeTab} — leads table content coming ]
        </p>
      </div>
    </div>
  )
}
