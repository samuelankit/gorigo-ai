"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderKanban } from "lucide-react";

interface Department {
  id: number;
  name: string;
  color?: string;
  status: string;
}

interface DepartmentFilterProps {
  value: string;
  onChange: (departmentId: string) => void;
}

export function DepartmentFilter({ value, onChange }: DepartmentFilterProps) {
  const [departments, setDepartments] = useState<Department[]>([]);

  const loadDepartments = useCallback(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((d) => {
        const depts = d?.departments || [];
        setDepartments(depts.filter((dept: Department) => dept.status === "active"));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  if (departments.length === 0) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className="w-[200px]"
        data-testid="select-department-filter"
      >
        <div className="flex items-center gap-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="All Departments" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" data-testid="option-department-all">
          All Departments
        </SelectItem>
        {departments.map((dept) => (
          <SelectItem
            key={dept.id}
            value={String(dept.id)}
            data-testid={`option-department-${dept.id}`}
          >
            <div className="flex items-center gap-2">
              {dept.color && (
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: dept.color }}
                />
              )}
              {dept.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
