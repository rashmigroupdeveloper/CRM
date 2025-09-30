import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

// Helper function to get user from token
async function getUserFromToken(request: Request) {
  try {
    const token = request.headers
      .get("cookie")
      ?.split("token=")[1]
      ?.split(";")[0];
    if (!token) {
      return null;
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload: decoded } = await jwtVerify(token, secret);

    if (decoded.userId) {
      const user = await prisma.users.findUnique({
        where: { email: decoded.userId as string },
      });
      return user;
    }
    return null;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}

// PUT /api/opportunities/[id]/materials/[materialId] - Update a material
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, materialId } = await params;
    const opportunityId = parseInt(id);
    const materialIdNum = parseInt(materialId);

    if (isNaN(opportunityId) || isNaN(materialIdNum)) {
      return NextResponse.json(
        { error: "Invalid opportunity or material ID" },
        { status: 400 }
      );
    }

    // Check if opportunity exists and user has access
    const opportunity = await prisma.opportunities.findFirst({
      where: {
        id: opportunityId,
        ownerId: user.role === "admin" ? undefined : user.id,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found or access denied" },
        { status: 404 }
      );
    }

    // Check if material exists and belongs to the opportunity
    const existingMaterial = await prisma.opportunity_materials.findFirst({
      where: {
        id: materialIdNum,
        opportunityId: opportunityId,
      },
    });

    if (!existingMaterial) {
      return NextResponse.json(
        { error: "Material not found or doesn't belong to this opportunity" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      type,
      materialDescription,
      diameter,
      class: materialClass,
      angle,
      quantity,
      unitOfMeasurement,
      notes,
    } = body;

    // Validation
    const requiredField = type === 'PIPE' ? materialClass : angle;
    if (!type || !materialDescription || !diameter || !requiredField || quantity === undefined || quantity <= 0) {
      const fieldName = type === 'PIPE' ? 'class' : 'angle';
      return NextResponse.json(
        { error: `Material description, diameter, ${fieldName}, and quantity are required. Quantity must be greater than 0.` },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive number" },
        { status: 400 }
      );
    }

    if (!['PIPE', 'FITTING'].includes(type)) {
      return NextResponse.json(
        { error: "Type must be either PIPE or FITTING" },
        { status: 400 }
      );
    }

    const updatedMaterial = await prisma.opportunity_materials.update({
      where: {
        id: materialIdNum,
      },
      data: {
        type: type,
        materialDescription: materialDescription.trim(),
        diameter: diameter.trim().toUpperCase(),
        class: type === 'PIPE' ? materialClass?.trim() : null,
        angle: type === 'FITTING' ? angle?.trim() : null,
        quantity: quantity,
        unitOfMeasurement: unitOfMeasurement || (type === 'PIPE' ? "MT" : "PCS"),
        notes: notes?.trim() || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ material: updatedMaterial });
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

// DELETE /api/opportunities/[id]/materials/[materialId] - Delete a material
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  try {
    const user = await getUserFromToken(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, materialId } = await params;
    const opportunityId = parseInt(id);
    const materialIdNum = parseInt(materialId);

    if (isNaN(opportunityId) || isNaN(materialIdNum)) {
      return NextResponse.json(
        { error: "Invalid opportunity or material ID" },
        { status: 400 }
      );
    }

    // Check if opportunity exists and user has access
    const opportunity = await prisma.opportunities.findFirst({
      where: {
        id: opportunityId,
        ownerId: user.role === "admin" ? undefined : user.id,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found or access denied" },
        { status: 404 }
      );
    }

    // Check if material exists and belongs to the opportunity
    const existingMaterial = await prisma.opportunity_materials.findFirst({
      where: {
        id: materialIdNum,
        opportunityId: opportunityId,
      },
    });

    if (!existingMaterial) {
      return NextResponse.json(
        { error: "Material not found or doesn't belong to this opportunity" },
        { status: 404 }
      );
    }

    await prisma.opportunity_materials.delete({
      where: {
        id: materialIdNum,
      },
    });

    return NextResponse.json({ message: "Material deleted successfully" });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
