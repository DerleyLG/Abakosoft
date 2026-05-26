import { useAuth } from "../context/AuthContext";
import { getPlanFeatures } from "../constants/planFeatures";

export function usePlan() {
  const { user } = useAuth();
  const plan = user?.plan || user?.empresa?.plan || "basico";
  const features = getPlanFeatures(plan);

  return {
    plan,
    esPrueba: user?.es_prueba || user?.estado_suscripcion === "prueba",
    features,
    loading: false,
    puedeAcceder: (feature) => features.includes(feature),
  };
}
