export default function CRM() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">CRM</h1>
        <p className="text-sm text-gray-500 mt-1">Customer relationship management — leads, status, timeline</p>
      </div>
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Lead list */}
        <div className="w-80 bg-white rounded-xl border border-gray-200 shrink-0">
          <p className="text-sm text-gray-400 text-center py-20">[ Lead list — content coming ]</p>
        </div>
        {/* Detail panel */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-400 text-center py-20">[ Lead detail panel — content coming ]</p>
        </div>
      </div>
    </div>
  )
}
