import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

type AuthenticatedUser = {
  id: number;
  name: string | null;
  email: string;
  employeeCode: string;
  role: string;
  verified: boolean;
  createdAt: Date;
};

// Helper function to get user from token
async function getUserFromToken(request: Request): Promise<AuthenticatedUser | null> {
  try {
    const token = request.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (payload.userId) {
      const prismaClient = (await import("@/lib/prisma")).prisma;
      const user = await prismaClient.users.findUnique({
        where: { email: payload.userId as string },
        select: {
          id: true,
          name: true,
          email: true,
          employeeCode: true,
          role: true,
          verified: true,
          createdAt: true,
        },
      });

      return user as AuthenticatedUser | null;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

interface WebPortalSaleRecord {
  id: string;
  ownerId: number;
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
}

interface EnhancedWebPortalSale extends WebPortalSaleRecord {
  variance: number;
  performanceRatio: number;
  performanceStatus: string;
  isAboveTarget: boolean;
  isBelowTarget: boolean;
  smartInsights: {
    status: string;
    variance: string;
    recommendation: string;
  };
}

interface AnalyticsSummary {
  totalRecords: number;
  totalExpectedValue: number;
  totalActualValue: number;
  totalExpectedCount: number;
  totalActualCount: number;
  overallPerformanceRatio: number;
  aboveTargetCount: number;
  belowTargetCount: number;
  onTargetCount: number;
  performanceStatusBreakdown: Record<string, number>;
}

interface TrendAnalysis {
  improving: boolean;
  declining: boolean;
  stable: boolean;
  growthRate: number;
}

const PERFORMANCE_THRESHOLDS = {
  excellent: 110,
  good: 90,
  average: 70,
};

const PERFORMANCE_RECOMMENDATIONS = {
  excellent: "Exceeding expectations - maintain momentum",
  good: "Good performance - continue current strategies",
  average: "Average performance - focus on improvement areas",
  below: "Below target - urgent attention needed",
};

function determinePerformanceStatus(performanceRatio: number): string {
  if (performanceRatio >= PERFORMANCE_THRESHOLDS.excellent) return "EXCELLENT";
  if (performanceRatio >= PERFORMANCE_THRESHOLDS.good) return "GOOD";
  if (performanceRatio >= PERFORMANCE_THRESHOLDS.average) return "AVERAGE";
  return "BELOW_TARGET";
}

function describeVariance(variance: number): string {
  if (variance > 0) {
    return `$${Math.abs(variance).toLocaleString()} above target`;
  }
  if (variance < 0) {
    return `$${Math.abs(variance).toLocaleString()} below target`;
  }
  return "On target";
}

function buildRecommendation(performanceRatio: number): string {
  if (performanceRatio >= PERFORMANCE_THRESHOLDS.excellent) return PERFORMANCE_RECOMMENDATIONS.excellent;
  if (performanceRatio >= PERFORMANCE_THRESHOLDS.good) return PERFORMANCE_RECOMMENDATIONS.good;
  if (performanceRatio >= PERFORMANCE_THRESHOLDS.average) return PERFORMANCE_RECOMMENDATIONS.average;
  return PERFORMANCE_RECOMMENDATIONS.below;
}

function enhanceRecord(record: WebPortalSaleRecord): EnhancedWebPortalSale {
  const expected = record.expectedSalesValue ?? 0;
  const actual = record.actualSalesValue ?? 0;
  const variance = Number((actual - expected).toFixed(2));
  const performanceRatio = expected > 0 ? Number(((actual / expected) * 100).toFixed(2)) : 0;
  const performanceStatus = determinePerformanceStatus(performanceRatio);

  return {
    ...record,
    variance,
    performanceRatio,
    performanceStatus,
    isAboveTarget: performanceRatio >= 100,
    isBelowTarget: performanceRatio < 80,
    smartInsights: {
      status: performanceStatus,
      variance: describeVariance(variance),
      recommendation: buildRecommendation(performanceRatio),
    },
  };
}

function calculateAnalytics(enhancedSales: EnhancedWebPortalSale[]): AnalyticsSummary {
  const totals = enhancedSales.reduce(
    (acc, sale) => {
      acc.totalExpectedValue += sale.expectedSalesValue ?? 0;
      acc.totalActualValue += sale.actualSalesValue ?? 0;
      acc.totalExpectedCount += sale.expectedSalesCount ?? 0;
      acc.totalActualCount += sale.actualSalesCount ?? 0;
      acc.performanceRatioSum += sale.performanceRatio;
      if (sale.isAboveTarget) acc.aboveTargetCount += 1;
      if (sale.isBelowTarget) acc.belowTargetCount += 1;
      if (!sale.isAboveTarget && !sale.isBelowTarget) acc.onTargetCount += 1;
      acc.performanceStatusBreakdown[sale.performanceStatus] =
        (acc.performanceStatusBreakdown[sale.performanceStatus] || 0) + 1;
      return acc;
    },
    {
      totalExpectedValue: 0,
      totalActualValue: 0,
      totalExpectedCount: 0,
      totalActualCount: 0,
      performanceRatioSum: 0,
      aboveTargetCount: 0,
      belowTargetCount: 0,
      onTargetCount: 0,
      performanceStatusBreakdown: {} as Record<string, number>,
    }
  );

  const totalRecords = enhancedSales.length;
  const overallPerformanceRatio = totalRecords > 0 ? Number((totals.performanceRatioSum / totalRecords).toFixed(2)) : 0;

  return {
    totalRecords,
    totalExpectedValue: Number(totals.totalExpectedValue.toFixed(2)),
    totalActualValue: Number(totals.totalActualValue.toFixed(2)),
    totalExpectedCount: totals.totalExpectedCount,
    totalActualCount: totals.totalActualCount,
    overallPerformanceRatio,
    aboveTargetCount: totals.aboveTargetCount,
    belowTargetCount: totals.belowTargetCount,
    onTargetCount: totals.onTargetCount,
    performanceStatusBreakdown: totals.performanceStatusBreakdown,
  };
}

function buildBaseInsights(analytics: AnalyticsSummary) {
  return {
    overallHealth:
      analytics.overallPerformanceRatio >= 100
        ? "Healthy"
        : analytics.overallPerformanceRatio >= 80
        ? "Good"
        : analytics.overallPerformanceRatio >= 60
        ? "Needs Attention"
        : "Critical",
    topPerformers: analytics.aboveTargetCount,
    needsAttention: analytics.belowTargetCount,
    recommendations: [
      analytics.overallPerformanceRatio < 80
        ? `${analytics.belowTargetCount} records below target - review sales strategies`
        : null,
      analytics.aboveTargetCount > analytics.totalRecords * 0.5
        ? "Strong performance across most records - scale successful strategies"
        : null,
      analytics.totalRecords === 0
        ? "No sales data available - start tracking web portal performance"
        : null,
    ].filter(Boolean) as string[],
  };
}

function calculatePerformanceSummary(enhancedSales: EnhancedWebPortalSale[]) {
  const totalExpectedValue = enhancedSales.reduce((sum, sale) => sum + (sale.expectedSalesValue ?? 0), 0);
  const totalActualValue = enhancedSales.reduce((sum, sale) => sum + (sale.actualSalesValue ?? 0), 0);
  const performanceRatio = totalExpectedValue > 0 ? Number(((totalActualValue / totalExpectedValue) * 100).toFixed(2)) : 0;
  const averagePerformance =
    enhancedSales.length > 0
      ? Number(
          (
            enhancedSales.reduce((sum, sale) => sum + sale.performanceRatio, 0) /
            enhancedSales.length
          ).toFixed(2)
        )
      : 0;

  const bestPerformingMonth = enhancedSales.length
    ? enhancedSales.reduce((best, current) =>
        (current.actualSalesValue ?? 0) > (best.actualSalesValue ?? 0) ? current : best
      ).month
    : null;

  return {
    totalRecords: enhancedSales.length,
    totalExpectedValue: Number(totalExpectedValue.toFixed(2)),
    totalActualValue: Number(totalActualValue.toFixed(2)),
    performanceRatio,
    bestPerformingMonth,
    averagePerformance,
  };
}

function buildMonthlyTrends(enhancedSales: EnhancedWebPortalSale[]) {
  const byMonth = new Map<
    string,
    { expectedSales: number; actualSales: number; variance: number; performanceRatio: number }
  >();

  enhancedSales.forEach((sale) => {
    const monthData = byMonth.get(sale.month) || {
      expectedSales: 0,
      actualSales: 0,
      variance: 0,
      performanceRatio: 0,
    };

    monthData.expectedSales += sale.expectedSalesValue ?? 0;
    monthData.actualSales += sale.actualSalesValue ?? 0;
    monthData.variance = Number((monthData.actualSales - monthData.expectedSales).toFixed(2));
    monthData.performanceRatio = monthData.expectedSales > 0
      ? Number(((monthData.actualSales / monthData.expectedSales) * 100).toFixed(2))
      : 0;

    byMonth.set(sale.month, monthData);
  });

  return Array.from(byMonth.entries()).map(([month, data]) => ({
    month,
    expectedSales: Number(data.expectedSales.toFixed(2)),
    actualSales: Number(data.actualSales.toFixed(2)),
    variance: data.variance,
    performanceRatio: data.performanceRatio,
  }));
}

function calculateTrendAnalysis(monthlyTrends: Array<{ month: string; performanceRatio: number }>): TrendAnalysis {
  const sorted = [...monthlyTrends].sort((a, b) => a.month.localeCompare(b.month));
  const analysis: TrendAnalysis = {
    improving: false,
    declining: false,
    stable: false,
    growthRate: 0,
  };

  if (sorted.length >= 2) {
    const previous = sorted[sorted.length - 2];
    const current = sorted[sorted.length - 1];
    const previousRatio = previous.performanceRatio || 0;
    const currentRatio = current.performanceRatio || 0;

    if (previousRatio !== 0) {
      analysis.growthRate = Number((((currentRatio - previousRatio) / Math.abs(previousRatio)) * 100).toFixed(2));
    } else if (currentRatio !== 0) {
      analysis.growthRate = 100;
    }

    if (analysis.growthRate > 5) {
      analysis.improving = true;
    } else if (analysis.growthRate < -5) {
      analysis.declining = true;
    } else {
      analysis.stable = true;
    }
  }

  return analysis;
}

function buildPerformanceInsights(
  performanceSummary: ReturnType<typeof calculatePerformanceSummary>,
  trendAnalysis: TrendAnalysis,
  performanceStatusBreakdown: Record<string, number>
) {
  return {
    overallPerformance:
      performanceSummary.performanceRatio >= 100
        ? "Excellent"
        : performanceSummary.performanceRatio >= 80
        ? "Good"
        : performanceSummary.performanceRatio >= 60
        ? "Average"
        : "Needs Improvement",
    bestMonth: performanceSummary.bestPerformingMonth,
    trend: trendAnalysis.improving ? "Improving" : trendAnalysis.declining ? "Declining" : "Stable",
    performanceRecommendations: [
      performanceSummary.performanceRatio < 80
        ? "Sales performance below target - review strategies"
        : null,
      trendAnalysis.declining
        ? "Recent performance declining - investigate causes"
        : null,
      Object.keys(performanceStatusBreakdown).length > 3
        ? "Multiple performance statuses indicate inconsistency"
        : null,
    ].filter(Boolean) as string[],
  };
}

// GET /api/web-portal-sales - Get web portal sales analytics
export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const showPerformance = searchParams.get("showPerformance") === "true";

    const records = await getWebPortalSalesRecords(month, user.id);
    const enhancedSales = records.map(enhanceRecord);
    const analytics = calculateAnalytics(enhancedSales);
    const baseInsights = buildBaseInsights(analytics);

    if (showPerformance) {
      const performanceSummary = calculatePerformanceSummary(enhancedSales);
      const monthlyTrends = buildMonthlyTrends(enhancedSales);
      const trendAnalysis = calculateTrendAnalysis(monthlyTrends);
      const performanceInsights = buildPerformanceInsights(
        performanceSummary,
        trendAnalysis,
        analytics.performanceStatusBreakdown
      );

      const combinedInsights = {
        ...baseInsights,
        ...performanceInsights,
        recommendations: Array.from(
          new Set([
            ...baseInsights.recommendations,
            ...performanceInsights.performanceRecommendations,
          ])
        ),
      };

      return NextResponse.json({
        webPortalSales: enhancedSales,
        analytics,
        performanceSummary,
        monthlyTrends,
        performanceStatusDistribution: analytics.performanceStatusBreakdown,
        trendAnalysis,
        insights: combinedInsights,
      });
    }

    return NextResponse.json({
      webPortalSales: enhancedSales,
      analytics,
      insights: baseInsights,
    });
  } catch (error: unknown) {
    console.error("Error fetching web portal sales:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to fetch web portal sales", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST /api/web-portal-sales - Create new web portal sales record
export async function POST(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      month,
      expectedSalesCount,
      actualSalesCount,
      expectedSalesValue,
      actualSalesValue,
      notes,
    } = body;

    if (!name || !month) {
      return NextResponse.json({ error: "Name and month are required" }, { status: 400 });
    }

    const variance = (actualSalesValue ?? 0) - (expectedSalesValue ?? 0);
    const performanceRatio = expectedSalesValue && expectedSalesValue > 0
      ? Number(((actualSalesValue ?? 0) / expectedSalesValue) * 100)
      : 0;
    const performanceStatus = determinePerformanceStatus(performanceRatio);

    const sale = await createWebPortalSale(
      {
        name,
        month,
        expectedSalesCount,
        actualSalesCount,
        expectedSalesValue,
        actualSalesValue,
        notes,
        performanceStatus,
      },
      user.id
    );

    const enhancedSale = enhanceRecord(sale);

    return NextResponse.json(
      {
        success: true,
        webPortalSale: enhancedSale,
        analytics: {
          performanceRatio: enhancedSale.performanceRatio,
          status: enhancedSale.performanceStatus,
          variance: enhancedSale.variance,
        },
        message: "Web portal sales record created with smart performance analytics",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error creating web portal sale:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to create web portal sale", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/web-portal-sales/[id] - Update web portal sales record
export async function PUT(request: Request) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Sales record ID is required" }, { status: 400 });
    }

    const updates = await request.json();

    let performanceStatus: string | undefined;
    if (updates.actualSalesValue !== undefined || updates.expectedSalesValue !== undefined) {
      const existingRecord = await getWebPortalSaleById(id, user.id);
      if (existingRecord) {
        const expectedValue =
          updates.expectedSalesValue ?? existingRecord.expectedSalesValue ?? 0;
        const actualValue = updates.actualSalesValue ?? existingRecord.actualSalesValue ?? 0;
        const performanceRatio = expectedValue > 0 ? (actualValue / expectedValue) * 100 : 0;
        performanceStatus = determinePerformanceStatus(performanceRatio);
        updates.performanceStatus = performanceStatus;
      }
    }

    const updatedSale = await updateWebPortalSale(id, updates, user.id);
    if (!updatedSale) {
      return NextResponse.json({ error: "Sales record not found" }, { status: 404 });
    }

    const enhancedSale = enhanceRecord(updatedSale);

    return NextResponse.json({
      success: true,
      webPortalSale: enhancedSale,
      message: "Web portal sales record updated with recalculated performance metrics",
    });
  } catch (error: unknown) {
    console.error("Error updating web portal sale:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: "Failed to update web portal sale", details: errorMessage },
      { status: 500 }
    );
  }
}

async function getWebPortalSalesRecords(month: string | null, ownerId: number): Promise<WebPortalSaleRecord[]> {
  const where: any = { ownerId };
  if (month) {
    where.month = month;
  }

  const sales = await prisma.web_portal_sales.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return sales.map((sale) => ({
    id: sale.id.toString(),
    ownerId: sale.ownerId,
    name: sale.name,
    month: sale.month,
    expectedSalesCount: sale.expectedSalesCount ?? undefined,
    actualSalesCount: sale.actualSalesCount ?? undefined,
    expectedSalesValue: sale.expectedSalesValue ?? undefined,
    actualSalesValue: sale.actualSalesValue ?? undefined,
    performanceStatus: sale.performanceStatus ?? undefined,
    notes: sale.notes ?? undefined,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  }));
}

async function createWebPortalSale(data: any, ownerId: number): Promise<WebPortalSaleRecord> {
  const sale = await prisma.web_portal_sales.create({
    data: {
      ownerId,
      name: data.name,
      month: data.month,
      expectedSalesCount: data.expectedSalesCount ?? null,
      actualSalesCount: data.actualSalesCount ?? null,
      expectedSalesValue: data.expectedSalesValue ?? null,
      actualSalesValue: data.actualSalesValue ?? null,
      notes: data.notes ?? null,
      performanceStatus: data.performanceStatus ?? null,
    },
  });

  return {
    id: sale.id.toString(),
    ownerId: sale.ownerId,
    name: sale.name,
    month: sale.month,
    expectedSalesCount: sale.expectedSalesCount ?? undefined,
    actualSalesCount: sale.actualSalesCount ?? undefined,
    expectedSalesValue: sale.expectedSalesValue ?? undefined,
    actualSalesValue: sale.actualSalesValue ?? undefined,
    performanceStatus: sale.performanceStatus ?? undefined,
    notes: sale.notes ?? undefined,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}

async function getWebPortalSaleById(id: string, ownerId: number): Promise<WebPortalSaleRecord | null> {
  const sale = await prisma.web_portal_sales.findFirst({
    where: { id: parseInt(id, 10), ownerId },
  });

  if (!sale) return null;

  return {
    id: sale.id.toString(),
    ownerId: sale.ownerId,
    name: sale.name,
    month: sale.month,
    expectedSalesCount: sale.expectedSalesCount ?? undefined,
    actualSalesCount: sale.actualSalesCount ?? undefined,
    expectedSalesValue: sale.expectedSalesValue ?? undefined,
    actualSalesValue: sale.actualSalesValue ?? undefined,
    performanceStatus: sale.performanceStatus ?? undefined,
    notes: sale.notes ?? undefined,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}

async function updateWebPortalSale(id: string, updates: any, ownerId: number): Promise<WebPortalSaleRecord | null> {
  const existing = await prisma.web_portal_sales.findFirst({
    where: { id: parseInt(id, 10), ownerId },
  });

  if (!existing) {
    return null;
  }

  const updateData: any = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.month !== undefined) updateData.month = updates.month;
  if (updates.expectedSalesCount !== undefined) updateData.expectedSalesCount = updates.expectedSalesCount;
  if (updates.actualSalesCount !== undefined) updateData.actualSalesCount = updates.actualSalesCount;
  if (updates.expectedSalesValue !== undefined) updateData.expectedSalesValue = updates.expectedSalesValue;
  if (updates.actualSalesValue !== undefined) updateData.actualSalesValue = updates.actualSalesValue;
  if (updates.performanceStatus !== undefined) updateData.performanceStatus = updates.performanceStatus;
  if (updates.notes !== undefined) updateData.notes = updates.notes;

  const sale = await prisma.web_portal_sales.update({
    where: { id: existing.id },
    data: updateData,
  });

  return {
    id: sale.id.toString(),
    ownerId: sale.ownerId,
    name: sale.name,
    month: sale.month,
    expectedSalesCount: sale.expectedSalesCount ?? undefined,
    actualSalesCount: sale.actualSalesCount ?? undefined,
    expectedSalesValue: sale.expectedSalesValue ?? undefined,
    actualSalesValue: sale.actualSalesValue ?? undefined,
    performanceStatus: sale.performanceStatus ?? undefined,
    notes: sale.notes ?? undefined,
    createdAt: sale.createdAt.toISOString(),
    updatedAt: sale.updatedAt.toISOString(),
  };
}
