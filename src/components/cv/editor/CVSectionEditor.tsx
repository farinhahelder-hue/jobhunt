'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Minus, Trash2 } from 'lucide-react';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  onDelete?: () => void;
}

function SortableItem({ id, children, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 mb-2 p-2 bg-white rounded border">
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical size={16} />
      </button>
      <div className="flex-1">{children}</div>
      {onDelete && (
        <button onClick={onDelete} className="text-red-400 hover:text-red-600">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

export interface Experience {
  company?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
}

export interface Education {
  institution?: string;
  degree?: string;
  field?: string;
  graduation_date?: string;
}

export interface Skill {
  name: string;
}

interface CVSectionEditorProps {
  title: string;
  items: any[];
  onChange: (items: any[]) => void;
  renderItem: (item: any, index: number, onChange: (field: string, value: any) => void) => React.ReactNode;
  addItemTemplate: () => any;
}

export function CVSectionEditor({
  title,
  items,
  onChange,
  renderItem,
  addItemTemplate,
}: CVSectionEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((_, i) => i.toString() === active.id.toString());
      const newIndex = items.findIndex((_, i) => i.toString() === over.id.toString());
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  }

  const addItem = () => {
    onChange([...items, addItemTemplate()]);
  };

  const deleteItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  return (
    <div className="cv-section-editor mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-700">{title}</h3>
        <button
          onClick={addItem}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {items.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((_, i) => i.toString())} strategy={verticalListSortingStrategy}>
            {items.map((item, index) => (
              <SortableItem
                key={index}
                id={index.toString()}
                onDelete={() => deleteItem(index)}
              >
                {renderItem(item, index, (field, value) => updateItem(index, field, value))}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-gray-400 italic">No items yet. Click "Add" to add one.</p>
      )}
    </div>
  );
}

// Re-export types for convenience
export type { };