"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Package,
  Ruler,
  Hash,
  Weight,
  FileText,
  AlertCircle,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { diaList, classList } from "@/lib/Mapping";

interface Material {
  id?: number;
  type: 'PIPE' | 'FITTING';
  materialDescription: string;
  diameter: string;
  class?: string;
  angle?: string;
  quantity: number;
  unitOfMeasurement: string;
  notes?: string;
}

interface EditingMaterial extends Material {
  id: number;
}

interface MaterialDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: number;
  opportunityName: string;
  companyName: string;
}

const UNIT_OPTIONS = [
  { value: "M", label: "M" },
  { value: "MT", label: "MT" },
  { value: "PCS", label: "PCS" },
];

const CLASS_OPTIONS = [
  { value: "A", label: "Class A" },
  { value: "B", label: "Class B" },
  { value: "C", label: "Class C" },
  { value: "Premium", label: "Premium" },
  { value: "Standard", label: "Standard" },
  { value: "Basic", label: "Basic" },
];

const ANGLE_OPTIONS = [
  { value: "45", label: "45°" },
  { value: "90", label: "90°" },
  { value: "180", label: "180°" },
  { value: "Tee", label: "Tee" },
  { value: "Cross", label: "Cross" },
  { value: "Reducer", label: "Reducer" },
];

export default function MaterialDetailsDialog({
  isOpen,
  onClose,
  opportunityId,
  opportunityName,
  companyName,
}: MaterialDetailsDialogProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingMaterial, setEditingMaterial] =
    useState<EditingMaterial | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<'PIPE' | 'FITTING' | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipes' | 'fittings'>('pipes');

  const [newPipeMaterial, setNewPipeMaterial] = useState<Material>({
    type: "PIPE",
    materialDescription: "",
    diameter: "",
    class: "",
    quantity: 0,
    unitOfMeasurement: "M",
    notes: "",
  });

  const [newFittingMaterial, setNewFittingMaterial] = useState<Material>({
    type: "FITTING",
    materialDescription: "",
    diameter: "",
    angle: "",
    quantity: 0,
    unitOfMeasurement: "PCS",
    notes: "",
  });

  // Fetch materials when dialog opens
  useEffect(() => {
    if (isOpen && opportunityId) {
      fetchMaterials();
    }
  }, [isOpen, opportunityId]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/opportunities/${opportunityId}/materials`
      );
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
      } else {
        toast.error("Failed to fetch materials");
      }
    } catch (error) {
      console.error("Error fetching materials:", error);
      toast.error("Error fetching materials");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (material: Material) => {
    const requiredField = material.type === 'PIPE' ? material.class : material.angle;
    if (
      !material.materialDescription ||
      !material.diameter ||
      !requiredField ||
      material.quantity <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/opportunities/${opportunityId}/materials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(material),
        }
      );

      if (response.ok) {
        const data = await response.json();
         const tempMaterial = { ...material, id: data.material.id }; // Temporary ID for optimistic update
        // Replace temp material with actual material from response
        setMaterials(prev => [tempMaterial, ...prev]);
        toast.success(`${material.type === 'PIPE' ? 'Pipe' : 'Fitting'} material added successfully`);
        if (material.type === 'PIPE') {
          setNewPipeMaterial({
            type: "PIPE",
            materialDescription: "",
            diameter: "",
            class: "",
            quantity: 0,
            unitOfMeasurement: "MT",
            notes: "",
          });
        } else {
          setNewFittingMaterial({
            type: "FITTING",
            materialDescription: "",
            diameter: "",
            angle: "",
            quantity: 0,
            unitOfMeasurement: "PCS",
            notes: "",
          });
        }
        setIsAddingNew(null);
      } else {
        // Rollback: remove the optimistically added material
        fetchMaterials();
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to add material");
      }
    } catch (error) {
      fetchMaterials();
      console.error("Error adding material:", error);
      toast.error("Error adding material");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditMaterial = async (material: Material | null) => {
    if (!material) return;
    const requiredField = material.type === 'PIPE' ? material.class : material.angle;
    if (
      !material.materialDescription ||
      !material.diameter ||
      !requiredField ||
      material.quantity <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Find the original material for rollback
    const originalMaterial = materials.find(m => m.id === material.id);
    if (!originalMaterial) return;

    // Optimistically update local state
    setMaterials(prev => prev.map(m => m.id === material.id ? material : m));

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/opportunities/${opportunityId}/materials/${material.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: material.type,
            materialDescription: material.materialDescription,
            diameter: material.diameter,
            class: material.class,
            angle: material.angle,
            quantity: material.quantity,
            unitOfMeasurement: material.unitOfMeasurement,
            notes: material.notes,
          }),
        }
      );

      if (response.ok) {
        toast.success("Material updated successfully");
        setEditingMaterial(null);
      } else {
        fetchMaterials();
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update material");
      }
    } catch (error) {
      fetchMaterials();
      console.error("Error updating material:", error);
      toast.error("Error updating material");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    // Optimistically remove from local state
    setMaterials(prev => prev.filter(m => m.id !== materialId));

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/opportunities/${opportunityId}/materials/${materialId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Material deleted successfully");
      } else {
        // Rollback: add back to local state if deletion failed
        fetchMaterials();
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete material");
      }
    } catch (error) {
      // Rollback: add back to local state if deletion failed
      fetchMaterials();
      console.error("Error deleting material:", error);
      toast.error("Error deleting material");
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalQuantity = (type?: 'PIPE' | 'FITTING') => {
    if (type) {
      return materials
        .filter(m => m.type === type)
        .reduce((total, material) => total + material.quantity, 0);
    }
    return materials.reduce((total, material) => total + material.quantity, 0);
  };

  const getTotalQuantityWithUnit = (type: 'PIPE' | 'FITTING') => {
    const totalQuantity = getTotalQuantity(type);
    const unit = type === 'PIPE' ? 'M' : 'PCS';
    return { quantity: totalQuantity, unit };
  };

  const getUnitLabel = (unit: string) => {
    const option = UNIT_OPTIONS.find((opt) => opt.value === unit);
    return option ? option.label : unit;
  };

  const getClassLabel = (classValue?: string) => {
    if (!classValue) return "-";
    return classValue;
  };

  const getAngleLabel = (angleValue?: string) => {
    if (!angleValue) return "-";
    const option = ANGLE_OPTIONS.find((opt) => opt.value === angleValue);
    return option ? option.label : angleValue;
  };

  const pipes = materials.filter(m => m.type === 'PIPE');
  const fittings = materials.filter(m => m.type === 'FITTING');

  const renderMaterialTable = (materialsList: Material[], type: 'PIPE' | 'FITTING') => (
    <div className="border rounded-lg flex-1 h-auto">
      {/* This inner div ensures the table body scrolls while the header stays */}
      <div className="overflow-y-auto">
        <Table className="min-w-[900px]">
          <TableHeader className=" bg-gray-50 z-20 border-b-2 border-gray-200 shadow-sm">
                <TableRow>
              <TableHead className="font-semibold w-[250px]">
                Description
              </TableHead>
              <TableHead className="font-semibold w-[100px]">
                Diameter
              </TableHead>
              <TableHead className="font-semibold w-[80px]">
                {type === 'PIPE' ? 'Class' : 'Angle'}
              </TableHead>
              <TableHead className="font-semibold w-[100px]">
                Quantity
              </TableHead>
              <TableHead className="font-semibold w-[120px]">
                Unit
              </TableHead>
              <TableHead className="font-semibold w-[150px]">
                Notes
              </TableHead>
              <TableHead className="font-semibold text-center w-[100px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Add New Material Row */}
            {isAddingNew === type && (
              <TableRow className="bg-blue-50 border-blue-200">
                <TableCell className="w-[250px]">
                  <Textarea
                    placeholder="Material description"
                    value={type === 'PIPE' ? newPipeMaterial.materialDescription : newFittingMaterial.materialDescription}
                    onChange={(e) => {
                      if (type === 'PIPE') {
                        setNewPipeMaterial({
                          ...newPipeMaterial,
                          materialDescription: e.target.value,
                        });
                      } else {
                        setNewFittingMaterial({
                          ...newFittingMaterial,
                          materialDescription: e.target.value,
                        });
                      }
                    }}
                    className="border-blue-300 focus:border-blue-500 w-full min-h-[60px] resize-none"
                    rows={2}
                  />
                </TableCell>
                <TableCell className="w-[100px]">
                  <Select
                    value={type === 'PIPE' ? newPipeMaterial.diameter : newFittingMaterial.diameter}
                    onValueChange={(value) => {
                      if (type === 'PIPE') {
                        setNewPipeMaterial({
                          ...newPipeMaterial,
                          diameter: value,
                        });
                      } else {
                        setNewFittingMaterial({
                          ...newFittingMaterial,
                          diameter: value,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="border-blue-300 focus:border-blue-500 w-full">
                      <SelectValue placeholder="Select diameter" />
                    </SelectTrigger>
                    <SelectContent>
                      {diaList.map((dia) => (
                        <SelectItem
                          key={dia}
                          value={`DN${dia}`}
                        >
                          DN{dia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-[100px]">
                  <Select
                    value={type === 'PIPE' ? (newPipeMaterial.class || "") : (newFittingMaterial.angle || "")}
                    onValueChange={(value) => {
                      if (type === 'PIPE') {
                        setNewPipeMaterial({ ...newPipeMaterial, class: value });
                      } else {
                        setNewFittingMaterial({ ...newFittingMaterial, angle: value });
                      }
                    }}
                  >
                    <SelectTrigger className="border-blue-300 focus:border-blue-500 w-full">
                      <SelectValue placeholder={`Select ${type === 'PIPE' ? 'class' : 'angle'}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(type === 'PIPE' ? classList : ANGLE_OPTIONS).map((option) => (
                        <SelectItem
                          key={typeof option === 'string' ? option : option.value}
                          value={typeof option === 'string' ? option : option.value}
                        >
                          {typeof option === 'string' ? option : option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-[100px]">
                  <Input
                    type="number"
                    placeholder="0"
                    min="0"
                    step="0.01"
                    value={type === 'PIPE' ? (newPipeMaterial.quantity || "") : (newFittingMaterial.quantity || "")}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (type === 'PIPE') {
                        setNewPipeMaterial({
                          ...newPipeMaterial,
                          quantity: value,
                        });
                      } else {
                        setNewFittingMaterial({
                          ...newFittingMaterial,
                          quantity: value,
                        });
                      }
                    }}
                    className="border-blue-300 focus:border-blue-500 w-full"
                  />
                </TableCell>
                <TableCell className="w-[100px]">
                  <Select
                    value={type === 'PIPE' ? newPipeMaterial.unitOfMeasurement : newFittingMaterial.unitOfMeasurement}
                    onValueChange={(value) => {
                      if (type === 'PIPE') {
                        setNewPipeMaterial({
                          ...newPipeMaterial,
                          unitOfMeasurement: value,
                        });
                      } else {
                        setNewFittingMaterial({
                          ...newFittingMaterial,
                          unitOfMeasurement: value,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="border-blue-300 focus:border-blue-500 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="w-[150px]">
                  <Input
                    placeholder="Optional notes"
                    value={type === 'PIPE' ? (newPipeMaterial.notes || "") : (newFittingMaterial.notes || "")}
                    onChange={(e) => {
                      if (type === 'PIPE') {
                        setNewPipeMaterial({
                          ...newPipeMaterial,
                          notes: e.target.value,
                        });
                      } else {
                        setNewFittingMaterial({
                          ...newFittingMaterial,
                          notes: e.target.value,
                        });
                      }
                    }}
                    className="border-blue-300 focus:border-blue-500 w-full"
                  />
                </TableCell>
                <TableCell className="w-[100px]">
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={() => handleAddMaterial(type === 'PIPE' ? newPipeMaterial : newFittingMaterial)}
                      disabled={submitting}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingNew(null)}
                      disabled={submitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Existing Materials */}
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading materials...
                  </div>
                </TableCell>
              </TableRow>
            ) : materialsList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <AlertCircle className="h-8 w-8" />
                    <p>No {type.toLowerCase()} materials added yet</p>
                    <p className="text-sm">
                      Click "Add {type === 'PIPE' ? 'Pipe' : 'Fitting'} Material" to get started
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              materialsList.map((material, index) => (
                <TableRow
                  key={material.id}
                  className={cn(index % 2 === 0 ? "bg-gray-300/50" : "bg-white", "hover:bg-blue-100  transition-colors cursor-pointer")}
                >
                  {editingMaterial?.id === material.id ? (
                    // Edit Mode
                    <>
                      <TableCell className="w-[250px]">
                        <Textarea
                          value={
                            editingMaterial?.materialDescription ?? ""
                          }
                          onChange={(e) =>
                            setEditingMaterial(
                              editingMaterial
                                ? {
                                    ...editingMaterial,
                                    materialDescription: e.target.value,
                                  }
                                : null
                            )
                          }
                          className="border-orange-300 focus:border-orange-500 w-full min-h-[60px] resize-none"
                          rows={2}
                        />
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Select
                          value={editingMaterial?.diameter ?? ""}
                          onValueChange={(value) =>
                            setEditingMaterial(
                              editingMaterial
                                ? {
                                    ...editingMaterial,
                                    diameter: value,
                                  }
                                : null
                            )
                          }
                        >
                          <SelectTrigger className="border-orange-300 focus:border-orange-500 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {diaList.map((dia) => (
                              <SelectItem
                                key={dia}
                                value={`DN${dia}`}
                              >
                                DN{dia}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Select
                          value={editingMaterial?.type === 'PIPE' ? (editingMaterial?.class ?? "") : (editingMaterial?.angle ?? "")}
                          onValueChange={(value) =>
                            setEditingMaterial(
                              editingMaterial
                                ? editingMaterial.type === 'PIPE'
                                  ? { ...editingMaterial, class: value }
                                  : { ...editingMaterial, angle: value }
                                : null
                            )
                          }
                        >
                          <SelectTrigger className="border-orange-300 focus:border-orange-500 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(editingMaterial?.type === 'PIPE' ? classList : ANGLE_OPTIONS).map((option) => (
                              <SelectItem
                                key={typeof option === 'string' ? option : option.value}
                                value={typeof option === 'string' ? option : option.value}
                              >
                                {typeof option === 'string' ? option : option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingMaterial?.quantity ?? ""}
                          onChange={(e) =>
                            setEditingMaterial(
                              editingMaterial
                                ? {
                                    ...editingMaterial,
                                    quantity:
                                      parseFloat(e.target.value) || 0,
                                  }
                                : null
                            )
                          }
                          className="border-orange-300 focus:border-orange-500 w-full"
                        />
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Select
                          value={
                            editingMaterial?.unitOfMeasurement ?? ""
                          }
                          onValueChange={(value) =>
                            setEditingMaterial(
                              editingMaterial
                                ? {
                                    ...editingMaterial,
                                    unitOfMeasurement: value,
                                  }
                                : null
                            )
                          }
                        >
                          <SelectTrigger className="border-orange-300 focus:border-orange-500 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        <Input
                          value={
                            editingMaterial
                              ? editingMaterial.notes || ""
                              : ""
                          }
                          onChange={(e) =>
                            setEditingMaterial(
                              editingMaterial
                                ? {
                                    ...editingMaterial,
                                    notes: e.target.value,
                                  }
                                : null
                            )
                          }
                          className="border-orange-300 focus:border-orange-500 w-full"
                        />
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleEditMaterial(editingMaterial)
                            }
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingMaterial(null)}
                            disabled={submitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    // View Mode
                    <>
                      <TableCell className="font-medium w-[250px]">
                        <div
                          className="whitespace-pre-wrap max-h-20 overflow-y-auto pr-2"
                          title={material.materialDescription}
                        >
                          {material.materialDescription}
                        </div>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Badge variant="outline" className="font-mono">
                          {material.diameter}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <Badge variant="secondary">
                          {material.type === 'PIPE' ? getClassLabel(material.class) : getAngleLabel(material.angle)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-green-600 w-[100px]">
                        {material.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="w-[120px]">
                        <span className="text-sm text-gray-600">
                          {getUnitLabel(material.unitOfMeasurement)}
                        </span>
                      </TableCell>
                      <TableCell className="w-[150px]">
                        {material.notes ? (
                          <div
                            className="truncate pr-2"
                            title={material.notes}
                          >
                            <span className="text-sm text-gray-600">
                              {material.notes}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="w-[100px]">
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              material.id &&
                              setEditingMaterial(
                                material as EditingMaterial
                              )
                            }
                            disabled={submitting || !!isAddingNew}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              material.id &&
                              handleDeleteMaterial(material.id)
                            }
                            disabled={submitting || !!isAddingNew}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:w-[90vw] lg:w-[80vw] !max-w-none max-h-[98vh] flex flex-col p-0 overflow-hidden"> {/* DialogContent itself is overflow-hidden */}
        <DialogHeader className="border-b pb-3 px-6 pt-6 flex-shrink-0"> {/* Header is fixed */}
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Material Details - {opportunityName}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-1">
            Company: {companyName} • {materials.length} Material
            {materials.length !== 1 ? "s" : ""}{" "}
            {materials.length > 0 &&
              `• Pipes: ${pipes.length} • Fittings: ${fittings.length}`}
          </DialogDescription>
        </DialogHeader>

        {/* This is the main scrollable area of the dialog */}
        <div className="flex flex-col flex-1 overflow-y-auto px-6 py-4"> {/* Changed to overflow-y-auto */}
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 flex-shrink-0">
            <Card>
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Total Materials
                  </span>
                </div>
                <div className="text-base font-bold text-blue-600">
                  {materials.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Pipes
                  </span>
                </div>
                <div className="text-base font-bold text-green-600">
                  {pipes.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Fittings
                  </span>
                </div>
                <div className="text-base font-bold text-purple-600">
                  {fittings.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">
                    Total Quantity
                  </span>
                </div>
                <div className="text-base font-bold text-orange-600">
                  {(() => {
                    const { quantity, unit } = getTotalQuantityWithUnit(activeTab === 'pipes' ? 'PIPE' : 'FITTING');
                    return `${quantity.toLocaleString()} ${unit}`;
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pipes' | 'fittings')} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 mb-4 flex-shrink-0">
              <TabsTrigger value="pipes" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                Pipes ({pipes.length})
              </TabsTrigger>
              <TabsTrigger value="fittings" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Fittings ({fittings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pipes" className="flex-1 flex flex-col min-h-0 ">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  Pipe Materials
                </h3>
                <Button
                  onClick={() => setIsAddingNew('PIPE')}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!!isAddingNew || submitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pipe Material
                </Button>
              </div>
              {renderMaterialTable(pipes, 'PIPE')}
            </TabsContent>

            <TabsContent value="fittings" className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  Fitting Materials
                </h3>
                <Button
                  onClick={() => setIsAddingNew('FITTING')}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={!!isAddingNew || submitting}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fitting Material
                </Button>
              </div>
              {renderMaterialTable(fittings, 'FITTING')}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t pt-4 px-6 pb-6 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
