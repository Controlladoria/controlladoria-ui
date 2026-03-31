/**
 * Date formatting utilities for Brazilian timezone
 * All dates from the backend are in UTC and need to be converted to BRT/BRST
 */

/**
 * Format a UTC date string to Brazilian timezone with full date and time
 * @param utcDateString - ISO date string in UTC
 * @returns Formatted string in Brazilian timezone (DD/MM/YYYY, HH:MM:SS)
 */
export function formatBrazilianDateTime(utcDateString: string): string {
  try {
    const date = new Date(utcDateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }

    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Erro na data';
  }
}

/**
 * Format a UTC date string to Brazilian timezone with date only
 * @param utcDateString - ISO date string in UTC
 * @returns Formatted string in Brazilian timezone (DD/MM/YYYY)
 */
export function formatBrazilianDate(utcDateString: string): string {
  try {
    const date = new Date(utcDateString);

    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }

    return date.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Erro na data';
  }
}

/**
 * Format a UTC date string to Brazilian timezone with time only
 * @param utcDateString - ISO date string in UTC
 * @returns Formatted string in Brazilian timezone (HH:MM:SS)
 */
export function formatBrazilianTime(utcDateString: string): string {
  try {
    const date = new Date(utcDateString);

    if (isNaN(date.getTime())) {
      return 'Hora inválida';
    }

    return date.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Erro na hora';
  }
}

/**
 * Format a UTC date string to relative time (e.g., "há 2 horas")
 * @param utcDateString - ISO date string in UTC
 * @returns Formatted relative time string in Portuguese
 */
export function formatRelativeTime(utcDateString: string): string {
  try {
    const date = new Date(utcDateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'agora';
    if (diffMin < 60) return `há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
    if (diffHour < 24) return `há ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
    if (diffDay < 7) return `há ${diffDay} dia${diffDay > 1 ? 's' : ''}`;

    // For older dates, show full date
    return formatBrazilianDate(utcDateString);
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return formatBrazilianDateTime(utcDateString);
  }
}
