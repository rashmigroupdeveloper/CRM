"use client";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Plus,
  Search,
  Filter,
  Eye,
  TrendingUp,
  AlertCircle,
  Loader2,
  Calendar,
  MapPin,
  Building2,
  Target,
  Award,
  Star,
  Zap,
  Shield,
  BarChart3,
  Download,
  FileText,
  Globe
} from "lucide-react";

interface WebPortalSale {
  id: string;
  name: string;
  month: string;
  expectedSalesCount?: number;
  actualSalesCount?: number;
  expectedSalesValue?: number;
  actualSalesValue?: number;
  performanceStatus?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  variance: number;
  performanceRatio: number;
  isAboveTarget: boolean;
  isBelowTarget: boolean;
  isOnTarget?: boolean;
  smartInsights: {
    status: string;
    variance: string;
    recommendation: string;
  };
}

export default function WebPortalSalesPage() {
  const [sales, setSales] = useState<WebPortalSale[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [insights, setInsights] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<WebPortalSale | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPerformanceView, setIsPerformanceView] = useState(false); // Toggle between basic and performance views

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    month: new Date().toISOString().slice(0, 7), // Current month in YYYY-MM format
    expectedSalesValue: "",
    actualSalesValue: "",
    notes: ""
  });

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (isPerformanceView) {
        params.set('showPerformance', 'true');
      }
      const queryString = params.toString();
      const url = `/api/web-portal-sales${queryString ? '?' + queryString : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setSales(data.webPortalSales || []);
        setAnalytics(data.analytics || {});
        setInsights(data.insights || {});
        setError(null); // Clear any previous errors on successful fetch
      } else {
        setError(data.error || 'Failed to fetch web portal sales');
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      setError('Failed to load web portal sales data');
    } finally {
      setLoading(false);
    }
  }, [isPerformanceView]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const handleCreateSale = async () => {
    try {
      const response = await fetch('/api/web-portal-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Using actualSalesValue as the primary value for storage since that's what matters for record keeping
          // The API will calculate performance based on expected vs actual values
          expectedSalesValue: formData.expectedSalesValue ? parseFloat(formData.expectedSalesValue) : undefined,
          actualSalesValue: formData.actualSalesValue ? parseFloat(formData.actualSalesValue) : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsCreateDialogOpen(false);
        setFormData({
          name: "", month: new Date().toISOString().slice(0, 7),
          expectedSalesValue: "", actualSalesValue: "", notes: ""
        });
        await fetchSales();
      } else {
        alert(typeof data.error === 'string' ? data.error : data.error?.message || 'Failed to create web portal sale');
      }
    } catch (error) {
      console.error('Error creating web portal sale:', error);
      alert('Failed to create web portal sale');
    }
  };

  const handleExport = async (type: string, format: 'excel' | 'pdf' = 'excel') => {
    try {
      const exportUrl = `/api/export?type=web-portal-sales&format=${format}`;
      window.open(exportUrl, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export web portal sales data. Please try again.');
    }
  };

  const filteredSales = sales.filter(sale => {
    const matchesSearch = (sale.name && sale.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (sale.month && sale.month.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (sale.notes && sale.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || sale.performanceStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRecords: sales.length,
    totalExpectedValue: sales.reduce((sum, s) => sum + (s.expectedSalesValue || 0), 0),
    totalActualValue: sales.reduce((sum, s) => sum + (s.actualSalesValue || 0), 0),
    totalExpectedCount: sales.reduce((sum, s) => sum + (s.expectedSalesCount || 0), 0),
    totalActualCount: sales.reduce((sum, s) => sum + (s.actualSalesCount || 0), 0),
    overallPerformanceRatio: sales.length > 0 
      ? sales.reduce((sum, s) => sum + s.performanceRatio, 0) / sales.length 
      : 0,
    aboveTargetCount: sales.filter(s => s.isAboveTarget).length,
    belowTargetCount: sales.filter(s => s.isBelowTarget).length,
    onTargetCount: sales.filter(s => !s.isAboveTarget && !s.isBelowTarget).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading web portal sales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={fetchSales}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 mb-8 shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold text-white">Web Portal Sales</h1>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className="bg-orange-500/20 text-white border-white/30">
                        ${stats.totalActualValue.toLocaleString()} Actual Sales
                      </Badge>
                      <Badge className={`${
                        stats.overallPerformanceRatio >= 100 ? 'bg-green-500/20 text-green-100' :
                        stats.overallPerformanceRatio >= 80 ? 'bg-blue-500/20 text-blue-100' :
                        stats.overallPerformanceRatio >= 60 ? 'bg-yellow-500/20 text-yellow-100' :
                        'bg-red-500/20 text-red-100'
                      } border-white/30`}>
                        {stats.overallPerformanceRatio.toFixed(2)}% Performance
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-blue-100 text-lg max-w-2xl">
                  Track and analyze web portal sales performance, targets, and insights
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex gap-2">
                  <Button
                    variant={isPerformanceView ? "secondary" : "outline"}
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => setIsPerformanceView(!isPerformanceView)}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {isPerformanceView ? "Basic View" : "Performance View"}
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={() => handleExport('web-portal-sales', 'excel')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-white/10 border-red-200/20 text-white hover:bg-white/20"
                    onClick={() => handleExport('web-portal-sales', 'pdf')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sale
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add Web Portal Sale</DialogTitle>
                      <DialogDescription>
                        Track a new web portal sales record
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Name/Project</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Project or campaign name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="month">Month</Label>
                        <Input
                          id="month"
                          type="month"
                          value={formData.month}
                          onChange={(e) => setFormData({...formData, month: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="expectedSalesValue">Target Value ($)</Label>
                        <Input
                          id="expectedSalesValue"
                          type="number"
                          value={formData.expectedSalesValue}
                          onChange={(e) => setFormData({...formData, expectedSalesValue: e.target.value})}
                          placeholder="Target sales value"
                          title="This represents your sales target for the period"
                        />
                      </div>
                      <div>
                        <Label htmlFor="actualSalesValue">Actual Value ($)</Label>
                        <Input
                          id="actualSalesValue"
                          type="number"
                          value={formData.actualSalesValue}
                          onChange={(e) => setFormData({...formData, actualSalesValue: e.target.value})}
                          placeholder="Actual sales value"
                          title="This represents the actual achieved sales value"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Input
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSale}>
                        Add Sale
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                Total Actual Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                ${stats.totalActualValue.toLocaleString()}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                from {stats.totalRecords} records
              </p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -mr-8 -mt-8"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                Performance Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                {stats.overallPerformanceRatio.toFixed(2)}%
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">Overall</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -mr-8 -mt-8"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                Above Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{stats.aboveTargetCount}</div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Performing well</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-full -mr-8 -mt-8"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Shield className="h-4 w-4 text-red-600" />
                </div>
                Below Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-800 dark:text-red-200">{stats.belowTargetCount}</div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">Needs attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Insights and Recommendations */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-200 dark:border-blue-800/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <span>Performance Insights & Recommendations</span>
            </CardTitle>
            <CardDescription>
              AI-powered insights based on your web portal sales performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lg mb-3 text-blue-800 dark:text-blue-200">Overall Health</h4>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    insights.overallHealth === 'Healthy' ? 'bg-green-100 text-green-800' :
                    insights.overallHealth === 'Good' ? 'bg-blue-100 text-blue-800' :
                    insights.overallHealth === 'Needs Attention' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <span className={`font-semibold ${
                    insights.overallHealth === 'Healthy' ? 'text-green-700' :
                    insights.overallHealth === 'Good' ? 'text-blue-700' :
                    insights.overallHealth === 'Needs Attention' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {insights.overallHealth || 'No data'}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  Based on your current performance metrics and trend analysis
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-3 text-blue-800 dark:text-blue-200">Top Performers</h4>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                    <Zap className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-purple-700">{insights.topPerformers || 0} records</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Above target performance, contributing significantly to your success
                </p>
              </div>
            </div>

            {insights.recommendations && insights.recommendations.length > 0 ? (
              <div className="mt-4">
                <h4 className="font-semibold text-lg mb-3 text-blue-800 dark:text-blue-200">Recommendations</h4>
                <ul className="space-y-2">
                  {insights.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <div className="p-1 mt-1 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      </div>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">No recommendations available at this time</p>
            )}
          </CardContent>
        </Card>

        {/* Performance Status Distribution */}
        <Card className="mb-8 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span>Performance Status Distribution</span>
            </CardTitle>
            <CardDescription>
              Distribution of sales records across different performance categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analytics.performanceStatusBreakdown || {}).map(([status, count]) => {
                const countNum = count as number;
                const percentage = stats.totalRecords > 0 ? (countNum / stats.totalRecords) * 100 : 0;
                
                let statusColor = '';
                let statusBg = '';
                if (status === 'EXCELLENT') { statusColor = 'text-green-600'; statusBg = 'bg-green-500/20'; }
                else if (status === 'GOOD') { statusColor = 'text-blue-600'; statusBg = 'bg-blue-500/20'; }
                else if (status === 'AVERAGE') { statusColor = 'text-yellow-600'; statusBg = 'bg-yellow-500/20'; }
                else if (status === 'BELOW_TARGET') { statusColor = 'text-red-600'; statusBg = 'bg-red-500/20'; }
                else { statusColor = 'text-gray-600'; statusBg = 'bg-gray-500/20'; }
                
                return (
                  <div key={status} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`font-semibold ${statusColor} capitalize`}>{status.replace('_', ' ')}</h4>
                        <p className="text-2xl font-bold mt-1">{countNum}</p>
                      </div>
                      <Badge className={`${statusBg} ${statusColor.replace('text-', 'border-')} border rounded-full px-2 py-1 text-xs`}>
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            status === 'EXCELLENT' ? 'bg-green-500' :
                            status === 'GOOD' ? 'bg-blue-500' :
                            status === 'AVERAGE' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`} 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, month or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="EXCELLENT">Excellent</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="AVERAGE">Average</SelectItem>
                  <SelectItem value="BELOW_TARGET">Below Target</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="mb-8 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-slate-700/50 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span>Sales Performance Comparison</span>
              </div>
              <Badge variant="outline" className="text-xs">
                Last {Math.min(sales.length, 12)} periods
              </Badge>
            </CardTitle>
            <CardDescription>
              Visual comparison of expected vs actual sales performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {sales.length > 0 ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 flex items-end gap-1 justify-center pb-4 relative">
                    {sales.slice(0, 12).map((sale, index) => {
                      const maxExpected = Math.max(...sales.map(s => s.expectedSalesValue || 0));
                      const maxActual = Math.max(...sales.map(s => s.actualSalesValue || 0));
                      const maxValue = Math.max(maxExpected, maxActual, 1);
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1 min-w-[30px] max-w-[60px]">
                          <div className="flex items-end justify-center gap-0.5 w-full h-full">
                            <div 
                              className="w-1/3 rounded-t bg-blue-400 transition-all duration-300 hover:opacity-75"
                              style={{ height: `${((sale.expectedSalesValue || 0) / maxValue) * 80}%` }}
                              title={`Expected: ${(sale.expectedSalesValue || 0).toLocaleString()}`}
                            ></div>
                            <div 
                              className="w-1/3 rounded-t bg-green-500 transition-all duration-300 hover:opacity-75"
                              style={{ height: `${((sale.actualSalesValue || 0) / maxValue) * 80}%` }}
                              title={`Actual: ${(sale.actualSalesValue || 0).toLocaleString()}`}
                            ></div>
                          </div>
                          <div className="text-[8px] text-gray-500 mt-1 truncate w-full text-center">
                            {sale.month.split('-')[1]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-400 rounded"></div>
                      <span>Expected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Actual</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-300" />
                  <p className="mt-2">No data available to display chart</p>
                  <p className="text-sm mt-1">Add your first web portal sales record to see performance trends</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-t-lg">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Globe className="h-5 w-5 text-white" />
              </div>
              Web Portal Sales Records
              <Badge variant="outline" className="ml-2">
                {filteredSales.length} records
              </Badge>
            </CardTitle>
            <CardDescription>
              Track web portal sales performance and metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-700">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Name</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Month</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Expected Value</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Actual Value</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Variance</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Performance</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700 dark:text-slate-300">Recommendation</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TableCell className="font-medium">{sale.name}</TableCell>
                      <TableCell>{sale.month}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-600">
                          ${(sale.expectedSalesValue || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600">
                          ${(sale.actualSalesValue || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-semibold ${sale.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {sale.variance >= 0 ? '+' : ''}${sale.variance.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${sale.performanceRatio >= 100 ? 'text-green-600' : sale.performanceRatio >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {sale.performanceRatio.toFixed(2)}%
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${sale.performanceRatio >= 100 ? 'bg-green-500' : sale.performanceRatio >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(sale.performanceRatio, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            sale.performanceStatus === "EXCELLENT"
                              ? "bg-green-100 text-green-800"
                              : sale.performanceStatus === "GOOD"
                              ? "bg-blue-100 text-blue-800"
                              : sale.performanceStatus === "AVERAGE"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {sale.performanceStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs truncate" title={sale.smartInsights.recommendation}>
                          {sale.smartInsights.recommendation}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSale(sale);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Sale Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Web Portal Sale Details
              </DialogTitle>
              <DialogDescription>
                Comprehensive information about this web portal sales record
              </DialogDescription>
            </DialogHeader>

            {selectedSale && (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sales Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{selectedSale.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Month:</span>
                        <span>{selectedSale.month}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected Value:</span>
                        <span className="font-semibold text-gray-800">
                          ${(selectedSale.expectedSalesValue || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual Value:</span>
                        <span className="font-semibold text-green-600">
                          ${(selectedSale.actualSalesValue || 0).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Count Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expected Count:</span>
                        <span>{selectedSale.expectedSalesCount || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual Count:</span>
                        <span>{selectedSale.actualSalesCount || 'N/A'}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Variance:</span>
                        <span className={selectedSale.variance >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {selectedSale.variance >= 0 ? '+' : ''}${selectedSale.variance.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Performance Ratio:</span>
                        <span className={`font-semibold ${
                          selectedSale.performanceRatio >= 100 ? 'text-green-600' : 
                          selectedSale.performanceRatio >= 80 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {selectedSale.performanceRatio.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge
                          className={
                            selectedSale.performanceStatus === "EXCELLENT"
                              ? "bg-green-100 text-green-800"
                              : selectedSale.performanceStatus === "GOOD"
                              ? "bg-blue-100 text-blue-800"
                              : selectedSale.performanceStatus === "AVERAGE"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {selectedSale.performanceStatus}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <span className="text-gray-600">Recommendation:</span>
                        <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">
                          {selectedSale.smartInsights.recommendation}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Notes:</span>
                        <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">
                          {selectedSale.notes || 'No notes provided'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
