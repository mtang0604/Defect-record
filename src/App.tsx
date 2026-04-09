import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Loader2, Plus, ListTodo, CheckCircle2, Clock, AlertCircle, X, Trash2 } from 'lucide-react';

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
  vendor?: string;
  completionDate?: string;
}

interface ModalState {
  isOpen: boolean;
  type: 'vendor' | 'confirm' | 'delete' | null;
  rowIndex: number | null;
  newStatus: string | null;
  inputValue: string;
}

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'list'>('list');
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    rowIndex: null,
    newStatus: null,
    inputValue: ''
  });

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

  const handleUpdateStatus = (rowIndex: number, newStatus: string) => {
    if (!updaterName) {
      alert('請輸入更新人員名稱');
      return;
    }

    if (newStatus === '已通知廠商') {
      setModal({
        isOpen: true,
        type: 'vendor',
        rowIndex,
        newStatus,
        inputValue: ''
      });
      return;
    }

    if (newStatus === '完成') {
      setModal({
        isOpen: true,
        type: 'confirm',
        rowIndex,
        newStatus,
        inputValue: ''
      });
      return;
    }
  };

  const handleDelete = (rowIndex: number) => {
    setModal({
      isOpen: true,
      type: 'delete',
      rowIndex,
      newStatus: null,
      inputValue: ''
    });
  };

  const executeDelete = async (rowIndex: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports?rowIndex=${rowIndex}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete report');
      
      fetchReports();
      setModal({ isOpen: false, type: null, rowIndex: null, newStatus: null, inputValue: '' });
    } catch (err: any) {
      alert(`錯誤: ${err.message}`);
      setLoading(false);
    }
  };

  const executeUpdate = async (rowIndex: number, newStatus: string, vendor?: string) => {
    const now = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const payload: any = {
      status: newStatus,
      updater: updaterName,
    };

    if (newStatus === '已通知廠商') {
      payload.updateDate = now; // H column (更新日期)
      payload.vendor = vendor;  // I column (廠商)
    } else if (newStatus === '完成') {
      payload.completionDate = now; // J column (完成日期)
      // We explicitly do NOT set payload.updateDate here so it preserves the original "通知廠商" date in H column
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/reports?rowIndex=${rowIndex}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to update status');
      
      fetchReports();
      setModal({ isOpen: false, type: null, rowIndex: null, newStatus: null, inputValue: '' });
    } catch (err: any) {
      alert(`錯誤: ${err.message}`);
      setLoading(false);
    }
  };

  const handleModalConfirm = () => {
    if (!modal.rowIndex) return;

    if (modal.type === 'vendor') {
      if (!modal.newStatus) return;
      if (!modal.inputValue.trim()) {
        alert('請輸入廠商名稱');
        return;
      }
      executeUpdate(modal.rowIndex, modal.newStatus, modal.inputValue.trim());
    } else if (modal.type === 'confirm') {
      if (!modal.newStatus) return;
      executeUpdate(modal.rowIndex, modal.newStatus);
    } else if (modal.type === 'delete') {
      executeDelete(modal.rowIndex);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative">
      {/* Custom Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {modal.type === 'vendor' ? '輸入廠商資訊' : modal.type === 'delete' ? '確認刪除' : '確認操作'}
              </h3>
              <button 
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 py-8">
              {modal.type === 'vendor' ? (
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-gray-700">廠商名稱</label>
                  <input 
                    type="text"
                    autoFocus
                    value={modal.inputValue}
                    onChange={(e) => setModal({ ...modal, inputValue: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="例如: 某某零件行"
                  />
                </div>
              ) : modal.type === 'delete' ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-gray-700 font-medium leading-relaxed">
                    確定要刪除此筆回報嗎？此操作無法復原。
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                  <p className="text-gray-700 font-medium leading-relaxed">
                    確認廠商已補零件? 此操作將會把狀態標記為「完成」。
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setModal({ ...modal, isOpen: false })}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleModalConfirm}
                className={`px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all ${
                  modal.type === 'vendor' ? 'bg-blue-600 hover:bg-blue-700' : 
                  modal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 
                  'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-3 sm:py-0 sm:h-16 gap-3 sm:gap-0">
            <h1 className="text-xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              異常回報系統
            </h1>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 space-x-0">
              <button
                onClick={() => setActiveTab('form')}
                className={`flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${
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
                className={`flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${
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
                className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
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
            <div className="bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <label htmlFor="globalUpdater" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                目前更新人員:
              </label>
              <input
                type="text"
                id="globalUpdater"
                value={updaterName}
                onChange={(e) => setUpdaterName(e.target.value)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 sm:text-sm border-gray-300 rounded-md p-2 border"
                placeholder="請輸入您的姓名以進行狀態更新"
              />
              {!updaterName && (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
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
                    <li key={report.rowIndex} className="p-5 sm:px-6 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
                      <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {/* 刪除按鈕 */}
                        <div className="shrink-0">
                          <button
                            onClick={() => handleDelete(report.rowIndex)}
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            title="刪除此筆回報"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {/* 主要資訊區：日期、品號、數量 */}
                        <div className="flex flex-wrap items-center gap-8 flex-1">
                          {/* 日期 */}
                          <div className="flex flex-col min-w-[100px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">發生日期</span>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-base font-bold text-gray-900">{report.date}</span>
                            </div>
                            <div className="mt-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                report.status === '待處理' ? 'bg-red-100 text-red-700' : 
                                report.status === '已通知廠商' ? 'bg-amber-100 text-amber-700' : 
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {report.status}
                              </span>
                            </div>
                          </div>

                          {/* 品號與數量 */}
                          <div className="flex flex-col min-w-[140px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">品號 / 數量</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-black text-blue-600 tracking-tight">{report.itemNumber}</span>
                              <span className="text-xs font-bold text-gray-300">/</span>
                              <span className="text-2xl font-black text-gray-900 tracking-tight">{report.quantity}</span>
                            </div>
                            <span className="text-xs text-gray-500 mt-1 font-medium">回報人: {report.reporter}</span>
                          </div>

                          {/* 原因說明 - 靠右 */}
                          <div className="flex flex-col flex-1 md:text-right min-w-[200px]">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">原因說明</span>
                            <p className="text-sm text-gray-600 mt-1 italic leading-relaxed">
                              {report.reason}
                            </p>
                            {report.vendor && (
                              <div className="text-xs font-bold text-amber-600 mt-2">
                                廠商: {report.vendor}
                              </div>
                            )}
                            {report.completionDate && (
                              <div className="text-xs font-bold text-emerald-600 mt-1">
                                完成日期: {report.completionDate}
                              </div>
                            )}
                            {report.updater && (
                              <div className="text-[10px] text-gray-400 mt-2 font-mono">
                                {report.updater} @ {report.updateDate}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 操作按鈕 */}
                        <div className="flex flex-row md:flex-col gap-2 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                          {report.status === '待處理' && (
                            <button
                              onClick={() => handleUpdateStatus(report.rowIndex, '已通知廠商')}
                              disabled={!updaterName}
                              className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-2 border border-amber-200 text-xs font-bold rounded shadow-sm text-amber-700 bg-amber-50 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              已通知廠商
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(report.rowIndex, '完成')}
                            disabled={!updaterName}
                            className="flex-1 md:flex-none inline-flex items-center justify-center px-3 py-2 border border-emerald-200 text-xs font-bold rounded shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            標記完成
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
