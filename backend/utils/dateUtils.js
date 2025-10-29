const parseDateStringAsLocal = (dateInput) => {
    
    if (!dateInput) return new Date();

    if (dateInput instanceof Date) {
        
        const year = dateInput.getFullYear();
        const month = dateInput.getMonth();
        const day = dateInput.getDate();
        return new Date(year, month, day);
    }

    if (typeof dateInput === 'string') {
        const dateOnly = dateInput.split('T')[0];
        const [year, month, day] = dateOnly.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    return new Date();
};

module.exports = { parseDateStringAsLocal };