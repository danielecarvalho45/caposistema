/** Consultas arquivadas ficam no histórico, mas não ocupam a agenda visível. */
export function isVisibleOnAgenda(attendanceStatus: string): boolean {
  return attendanceStatus !== 'cancelado' && attendanceStatus !== 'remarcado'
}
