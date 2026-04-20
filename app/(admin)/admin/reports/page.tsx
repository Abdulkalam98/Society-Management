// app/(admin)/admin/reports/page.tsx — Reports
'use client';
import React, { useState, useCallback } from 'react';
import { reportApi } from '@/lib/api';
import { formatCurrency, getMonthName, getMonthOptions, getYearOptions, downloadFile } from '@/lib/utils';
import type { MonthlyReport, YearlyReport, OutstandingReport } from '@/types';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/lib/api';
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
} from 'lucide-react';

type ReportTab = 'monthly' | 'yearly' | 'outstanding';

export default function ReportsPage() {
  const { error: toastError, info } = useToast();
  const [activeTab, setActiveTab] = useState<ReportTab>('monthly');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [yearOnly, setYearOnly] = useState(String(new Date().getFullYear()));

  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null);
  const [outstandingReport, setOutstandingReport] = useState<OutstandingReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchMonthly = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await reportApi.getMonthly({ month: Number(month), year: Number(year) });
      setMonthlyReport(data);
    } catch (err) {
      toastError('Failed to load report', err instanceof ApiError ? err.message : 'Try again');
    } finally {
      setIsLoading(false);
    }
  }, [month, year, toastError]);

  const fetchYearly = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await reportApi.getYearly({ year: Number(yearOnly) });
      setYearlyReport(data);
    } catch (err) {
      toastError('Failed to load report', err instanceof ApiError ? err.message : 'Try again');
    } finally {
      setIsLoading(false);
    }
  }, [yearOnly, toastError]);

  const fetchOutstanding = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await reportApi.getOutstanding();
      setOutstandingReport(data);
    } catch (err) {
      toastError('Failed to load report', err instanceof ApiError ? err.message : 'Try again');
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    try {
      const response = await reportApi.downloadCsv({ month: Number(month), year: Number(year) });
      await downloadFile(
        response as unknown as Response,
        `report-${getMonthName(Number(month))}-${year}.csv`
      );
    } catch {
      toastError('Download failed', 'Could not download CSV report.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await reportApi.downloadPdf({ month: Number(month), year: Number(year) });
      await downloadFile(
        response as unknown as Response,
        `report-${getMonthName(Number(month))}-${year}.pdf`
      );
    } catch {
      toastError('Download failed', 'Could not download PDF report.');
    } finally {
      setIsDownloading(false);
    }
  };

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'monthly', label: 'Monthly', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'yearly', label: 'Yearly', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'outstanding', label: 'Outstanding', icon: <AlertCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm mt-0.5">Financial summaries and collection reports</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-current={activeTab === tab.id ? 'true' : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Monthly Report */}
      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Monthly Report" />
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-36">
                <Select
                  label="Month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  options={getMonthOptions().map((m) => ({ value: String(m.value), label: m.label }))}
                />
              </div>
              <div className="w-28">
                <Select
                  label="Year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  options={getYearOptions().map((y) => ({ value: String(y.value), label: y.label }))}
                />
              </div>
              <Button onClick={() => void fetchMonthly()} isLoading={isLoading}>
                Generate Report
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Download className="w-4 h-4" />}
                onClick={() => void handleDownloadCsv()}
                isLoading={isDownloading}
              >
                CSV
              </Button>
              <Button
                variant="secondary"
                leftIcon={<FileText className="w-4 h-4" />}
                onClick={() => void handleDownloadPdf()}
                isLoading={isDownloading}
              >
                PDF
              </Button>
            </div>
          </Card>

          {monthlyReport && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Expenses"
                value={formatCurrency(monthlyReport.totalExpenses)}
                icon={<TrendingUp className="w-6 h-6" />}
                colorClass="text-primary-600 bg-primary-50"
              />
              <StatCard
                title="Total Billed"
                value={formatCurrency(monthlyReport.totalBilled)}
                icon={<FileText className="w-6 h-6" />}
                colorClass="text-blue-600 bg-blue-50"
              />
              <StatCard
                title="Collected"
                value={formatCurrency(monthlyReport.totalCollected)}
                icon={<TrendingUp className="w-6 h-6" />}
                colorClass="text-green-600 bg-green-50"
              />
              <StatCard
                title="Outstanding"
                value={formatCurrency(monthlyReport.totalOutstanding)}
                subtitle={`${(monthlyReport.collectionRate * 100).toFixed(1)}% collection rate`}
                icon={<AlertCircle className="w-6 h-6" />}
                colorClass={monthlyReport.totalOutstanding > 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50'}
              />
            </div>
          )}

          {monthlyReport?.expenses && monthlyReport.expenses.length > 0 && (
            <Card>
              <CardHeader title="Expenses This Month" />
              <div className="divide-y divide-gray-100">
                {monthlyReport.expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{exp.title}</p>
                      <p className="text-xs text-gray-500">{exp.category?.name ?? '—'}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(exp.amount)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Yearly Report */}
      {activeTab === 'yearly' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Yearly Report" />
            <div className="flex flex-wrap gap-3 items-end">
              <div className="w-28">
                <Select
                  label="Year"
                  value={yearOnly}
                  onChange={(e) => setYearOnly(e.target.value)}
                  options={getYearOptions().map((y) => ({ value: String(y.value), label: y.label }))}
                />
              </div>
              <Button onClick={() => void fetchYearly()} isLoading={isLoading}>
                Generate Report
              </Button>
            </div>
          </Card>

          {yearlyReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Expenses" value={formatCurrency(yearlyReport.totalExpenses)} icon={<TrendingUp className="w-6 h-6" />} colorClass="text-primary-600 bg-primary-50" />
                <StatCard title="Total Billed" value={formatCurrency(yearlyReport.totalBilled)} icon={<FileText className="w-6 h-6" />} colorClass="text-blue-600 bg-blue-50" />
                <StatCard title="Collected" value={formatCurrency(yearlyReport.totalCollected)} icon={<TrendingUp className="w-6 h-6" />} colorClass="text-green-600 bg-green-50" />
                <StatCard title="Outstanding" value={formatCurrency(yearlyReport.totalOutstanding)} icon={<AlertCircle className="w-6 h-6" />} colorClass="text-red-600 bg-red-50" />
              </div>

              {yearlyReport.monthlyBreakdown && (
                <Card>
                  <CardHeader title="Monthly Breakdown" />
                  <div className="divide-y divide-gray-100">
                    {yearlyReport.monthlyBreakdown.map((row) => (
                      <div key={row.month} className="flex items-center justify-between py-3">
                        <span className="text-sm font-medium text-gray-700 w-24">
                          {getMonthName(row.month)}
                        </span>
                        <div className="flex items-center gap-8 text-sm">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Expenses</p>
                            <p className="font-medium">{formatCurrency(row.totalExpenses)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-green-500">Collected</p>
                            <p className="font-medium text-green-700">{formatCurrency(row.totalCollected)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-red-400">Outstanding</p>
                            <p className="font-medium text-red-600">{formatCurrency(row.totalOutstanding)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Outstanding Report */}
      {activeTab === 'outstanding' && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={() => void fetchOutstanding()} isLoading={isLoading}>
              Load Outstanding Dues
            </Button>
          </div>

          {outstandingReport && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard
                  title="Total Outstanding"
                  value={formatCurrency(outstandingReport.grandTotal)}
                  subtitle={`${outstandingReport.flats.length} flat${outstandingReport.flats.length !== 1 ? 's' : ''} with dues`}
                  icon={<AlertCircle className="w-6 h-6" />}
                  colorClass="text-red-600 bg-red-50"
                />
              </div>

              <Card padding="none">
                <div className="divide-y divide-gray-100">
                  {outstandingReport.flats.map((item) => (
                    <div key={item.flat.id} className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            Flat {item.flat.unitNumber}
                          </p>
                          <p className="text-sm text-gray-500">
                            Block {item.flat.block} · {item.flat.occupantName}
                          </p>
                        </div>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(item.totalDue)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.bills.map((bill) => (
                          <Badge key={bill.id} variant="red">
                            {bill.expense?.title ?? 'Bill'} — {formatCurrency(bill.amount - bill.paidAmount)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
