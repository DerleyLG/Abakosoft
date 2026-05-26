import { useAuth } from "../context/AuthContext";
import { getPlanFeatures, PLANS } from "../constants/planFeatures";

export function usePlan() {
  const { user } = useAuth();

  const plan = (user?.plan || user?.empresa?.plan || "basico").toLowerCase();
  const esPrueba = user?.es_prueba || user?.estado_suscripcion === "prueba";
  // Preferir features incluidas en el JWT; caer al espejo local como fallback
  const features = user?.features?.length
    ? user.features
    : getPlanFeatures(plan);

  return {
    plan,
    esPrueba,
    features,
    puedeAcceder: (feature) => features.includes(feature),
  };
}
