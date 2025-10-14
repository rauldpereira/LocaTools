export const parseDateStringAsLocal = (dateString: string): Date => {
    const dateOnly = dateString.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    return new Date(year, month - 1, day);
};