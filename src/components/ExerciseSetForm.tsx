
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { ExerciseSet } from '@/types/workout';

interface ExerciseSetFormProps {
  exerciseSets: ExerciseSet[];
  onUpdateSet: (id: string, field: keyof ExerciseSet, value: string | number) => void;
  onDeleteSet: (id: string) => void;
  onAddNewSet: () => void;
}

const ExerciseSetForm: React.FC<ExerciseSetFormProps> = ({
  exerciseSets,
  onUpdateSet,
  onDeleteSet,
  onAddNewSet
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Exercise Sets</Label>
        <Button
          onClick={onAddNewSet}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          + Add Set
        </Button>
      </div>

      {exerciseSets.map((set, index) => (
        <Card key={set.id} className="p-4 bg-gray-50 border-l-4 border-purple-400">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-medium text-gray-800">Set {index + 1}</h4>
            {exerciseSets.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteSet(set.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor={`exercise-${set.id}`}>Exercise Name *</Label>
              <Input
                id={`exercise-${set.id}`}
                value={set.exerciseName}
                onChange={(e) => onUpdateSet(set.id, 'exerciseName', e.target.value)}
                placeholder="e.g., Bench Press"
              />
            </div>
            
            <div>
              <Label htmlFor={`muscle-${set.id}`}>Muscle Group *</Label>
              <Input
                id={`muscle-${set.id}`}
                value={set.muscleGroup}
                onChange={(e) => onUpdateSet(set.id, 'muscleGroup', e.target.value)}
                placeholder="e.g., Chest"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`weight-${set.id}`}>Weight *</Label>
                <Input
                  id={`weight-${set.id}`}
                  value={set.weight}
                  onChange={(e) => onUpdateSet(set.id, 'weight', e.target.value)}
                  placeholder="e.g., 185 lbs"
                />
              </div>
              
              <div>
                <Label htmlFor={`reps-${set.id}`}>Reps *</Label>
                <Input
                  id={`reps-${set.id}`}
                  type="number"
                  value={set.reps || ''}
                  onChange={(e) => onUpdateSet(set.id, 'reps', parseInt(e.target.value) || 0)}
                  placeholder="e.g., 8"
                  min="0"
                />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default ExerciseSetForm;
