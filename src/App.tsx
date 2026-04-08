import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, ListTodo, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface Report {
  rowIndex: number;
  date: string;
  reporter: string;
  itemNumber: string;
  quantity: string;
  reason: string;
  status: string;
  updater: string;
  updateDate: string;
}

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('list');
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reporter, setReporter] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  // Update state
  const [updaterName, setUpdaterName] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/reports');
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      console.log('Frontend received reports:', data);
      setReports(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reporter || !itemNumber || !quantity || !reason) {
      alert('請填寫所有欄位');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reporter, itemNumber, quantity, reason }),
      });

      if (!res.ok) throw new Error('Failed to submit report');
      
      // Reset form
      setReporter('');
      setItemNumber('');
      setQuantity('');
      setReason('');
      
      alert('回報成功！');
      fetchReports();
      setActiveTab('list');
    } catch (err: any) {
      alert(`錯誤: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (rowIndex: number, newStatus: string) => {
    if (!updaterName) {
      alert('請輸入更新人員名稱');
      return;
    }

    try {
      setLoading(true);
      const updateDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
      const res = await fetch(`/api/reports/${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, updater: updaterName, updateDate }),
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      fetchReports();
    } catch (err: any) {
      alert(`錯誤: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              異常回報系統
            </h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'form'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                新增回報
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'list'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                待處理清單
              </button>
              <button
                onClick={fetchReports}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                重新整理
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  無法連接到 Google Sheets。請確保已在環境變數中設定 <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code> 和 <code>GOOGLE_PRIVATE_KEY</code>，並將試算表分享給該服務帳戶。
                  <br />
                  錯誤詳情: {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'form' ? (
          <div className="bg-white shadow rounded-lg overflow-hidden max-w-2xl mx-auto">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">填寫異常回報</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                      發生日期
                    </label>
                    <div className="mt-1">
                      <input
                        type="date"
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reporter" className="block text-sm font-medium text-gray-700">
                      回報人員
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="reporter"
                        value={reporter}
                        onChange={(e) => setReporter(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        placeholder="請輸入姓名"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="itemNumber" className="block text-sm font-medium text-gray-700">
                      品號
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="itemNumber"
                        value={itemNumber}
                        onChange={(e) => setItemNumber(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        placeholder="請輸入產品編號"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                      數量
                    </label>
                    <div className="mt-1">
                      <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        placeholder="請輸入數量"
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                      原因說明
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="reason"
                        rows={4}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        placeholder="請詳細描述異常原因..."
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                        送出中...
                      </>
                    ) : (
                      '送出回報'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-4 flex items-center gap-4">
              <label htmlFor="globalUpdater" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                目前更新人員:
              </label>
              <input
                type="text"
                id="globalUpdater"
                value={updaterName}
                onChange={(e) => setUpdaterName(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-64 sm:text-sm border-gray-300 rounded-md p-2 border"
                placeholder="請輸入您的姓名以進行狀態更新"
              />
              {!updaterName && (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  必須填寫才能更新狀態
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-20 bg-white shadow rounded-lg">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">目前沒有待處理的項目</h3>
                <p className="mt-1 text-sm text-gray-500">所有回報皆已完成或尚未有新回報。</p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {reports.map((report) => (
                    <li key={report.rowIndex} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {report.itemNumber}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              report.status === '待處理' ? 'bg-red-100 text-red-800' : 
                              report.status === '已通知廠商' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {report.reason}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {report.date}
                            </span>
                            <span>回報人: {report.reporter}</span>
                            <span>數量: {report.quantity}</span>
                          </div>
                          {report.updater && (
                            <div className="text-xs text-gray-400 mt-1">
                              最後更新: {report.updater} 於 {report.updateDate}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          {report.status === '待處理' && (
                            <button
                              onClick={() => handleUpdateStatus(report.rowIndex, '已通知廠商')}
                              disabled={!updaterName}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              標記為已通知廠商
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(report.rowIndex, '完成')}
                            disabled={!updaterName}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            標記為完成
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
