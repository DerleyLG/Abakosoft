// Hook para acceso a features del plan en cualquier página
import { usePlan } from "../hooks/usePlanApi";

export function usePlanFeature(feature) {
  const { features } = usePlan();
  return features.includes(feature);
}
