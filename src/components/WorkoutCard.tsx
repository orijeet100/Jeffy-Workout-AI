
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Dumbbell, Weight } from 'lucide-react';
import { Workout } from '@/types/workout';

interface WorkoutCardProps {
  workout: Workout;
  onDelete: (id: string) => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, onDelete }) => {
  // Group sets by muscle group, then by exercise name
  const groupedByMuscle = workout.exerciseSets.reduce((muscleGroups, set) => {
    if (!muscleGroups[set.muscleGroup]) {
      muscleGroups[set.muscleGroup] = {};
    }
    if (!muscleGroups[set.muscleGroup][set.exerciseName]) {
      muscleGroups[set.muscleGroup][set.exerciseName] = [];
    }
    muscleGroups[set.muscleGroup][set.exerciseName].push(set);
    return muscleGroups;
  }, {} as Record<string, Record<string, typeof workout.exerciseSets>>);

  return (
    <Card className="bg-gradient-to-r from-white to-purple-50 border-purple-200 shadow-md hover:shadow-lg transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex justify-end mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(workout.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full p-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {Object.entries(groupedByMuscle).map(([muscleGroup, exercises]) => (
            <div key={muscleGroup} className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px bg-purple-200 flex-1"></div>
                <span className="text-sm font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                  {muscleGroup}
                </span>
                <div className="h-px bg-purple-200 flex-1"></div>
              </div>
              
              {Object.entries(exercises).map(([exerciseName, sets]) => (
                <div key={exerciseName} className="bg-white p-4 rounded-lg border border-purple-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Dumbbell className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold text-gray-800 text-lg">{exerciseName}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {sets.map((set, index) => (
                      <div key={set.id} className="flex items-center justify-between text-sm text-gray-700 bg-gray-50 px-4 py-3 rounded-lg">
                        <span className="font-medium text-purple-600">Set {index + 1}</span>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Weight className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{set.weight}</span>
                          </div>
                          <span className="font-medium">{set.reps} reps</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-purple-100">
          <p className="text-sm text-gray-500 text-center">
            {workout.exerciseSets.length} total sets • {Object.values(groupedByMuscle).reduce((total, exercises) => total + Object.keys(exercises).length, 0)} exercises
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutCard;
