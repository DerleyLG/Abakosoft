// Formatea cantidades: sin decimales si es entero, con decimales si los tiene
export default function formateaCantidad(valor) {
  // Si es null, undefined, string vacío o no numérico, devolver "0"
  if (
    valor === null ||
    valor === undefined ||
    valor === "" ||
    isNaN(Number(valor))
  )
    return "0";
  const num = Number(valor);
  if (Number.isInteger(num)) return num.toLocaleString();
  // Redondear a 3 decimales y eliminar ceros innecesarios
  const redondeado = Math.round(num * 1000) / 1000;
  // Si después de redondear es entero, mostrar como entero
  if (Number.isInteger(redondeado)) return redondeado.toLocaleString();
  // Si no, mostrar hasta 3 decimales
  return redondeado.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
